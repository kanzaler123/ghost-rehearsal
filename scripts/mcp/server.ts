/**
 * Zero-dependency MCP server protocol layer: JSON-RPC 2.0 over stdio.
 * stdout carries JSON-RPC responses only. Diagnostics go to stderr.
 * Importing this module has no side effects; `runStdioServer` starts the loop.
 */
import { format } from 'node:util';
import { TOOLS, ToolError, UnknownToolError, callTool } from './tools';
import type { ToolContext } from './tools';

export const SERVER_INFO = { name: 'ghost-rehearsal-engine', version: '0.1.0' } as const;
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'] as const;
const INSTRUCTIONS = 'Read-only tools backed by the real Ghost Rehearsal discrete-event engine, plan validator and fate-card builder. Results are deterministic for the shipped open-house example.';
export const MAX_FRAME_BYTES = 16 * 1024 * 1024;
const MAX_HEADER_BYTES = 8192;

type Id = string | number | null;
export interface RpcResponse { jsonrpc: '2.0'; id: Id; result?: unknown; error?: { code: number; message: string; data?: unknown } }
export interface ServerOptions {
  context?: ToolContext;
  /** Diagnostic sink. Defaults to stderr. Never write to stdout from here. */
  log?: (message: string) => void;
}

const PARSE_ERROR = -32700, INVALID_REQUEST = -32600, METHOD_NOT_FOUND = -32601, INVALID_PARAMS = -32602, INTERNAL_ERROR = -32603;
class RpcError extends Error {
  constructor(readonly code: number, message: string) { super(message); }
}
const failure = (id: Id, code: number, message: string): RpcResponse => ({ jsonrpc: '2.0', id, error: { code, message } });
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const defaultLog = (message: string) => { process.stderr.write(`[ghost-rehearsal-mcp] ${message}\n`); };

/* ---------- Message handling ---------- */

function callResult(params: unknown, options: ServerOptions) {
  if (!isRecord(params) || typeof params.name !== 'string') throw new RpcError(INVALID_PARAMS, 'tools/call requires params.name (string).');
  const log = options.log ?? defaultLog;
  try {
    const result = callTool(params.name, params.arguments, options.context);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false };
  } catch (error) {
    if (error instanceof UnknownToolError) throw new RpcError(INVALID_PARAMS, error.message);
    if (error instanceof ToolError) return { content: [{ type: 'text', text: error.message }], isError: true };
    const detail = error instanceof Error ? error : new Error(String(error));
    log(`tool ${params.name} failed: ${detail.stack ?? detail.message}`);
    return { content: [{ type: 'text', text: `Internal error in tool ${params.name}: ${detail.message}` }], isError: true };
  }
}

function dispatch(method: string, params: unknown, options: ServerOptions): unknown {
  switch (method) {
    case 'initialize': {
      const requested = isRecord(params) ? params.protocolVersion : undefined;
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.find(version => version === requested) ?? SUPPORTED_PROTOCOL_VERSIONS[0];
      return { protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS };
    }
    case 'ping': return {};
    case 'tools/list': return { tools: TOOLS };
    case 'tools/call': return callResult(params, options);
    default: throw new RpcError(METHOD_NOT_FOUND, `Method not found: ${method}`);
  }
}

/** Handles one JSON-RPC message. Returns null for notifications and for stray responses. */
export function handleMessage(message: unknown, options: ServerOptions = {}): RpcResponse | null {
  if (!isRecord(message) || message.jsonrpc !== '2.0') return failure(null, INVALID_REQUEST, 'Invalid Request: expected a JSON-RPC 2.0 object.');
  const hasId = 'id' in message;
  const id = message.id;
  if (typeof message.method !== 'string') {
    // A response to a request this server never sent has nothing to answer.
    if (hasId && ('result' in message || 'error' in message)) return null;
    return failure(typeof id === 'string' || typeof id === 'number' ? id : null, INVALID_REQUEST, 'Invalid Request: "method" must be a string.');
  }
  if (!hasId) {
    // Notifications never get a response, including notifications/initialized and unknown ones.
    return null;
  }
  if (typeof id !== 'string' && typeof id !== 'number') return failure(null, INVALID_REQUEST, 'Invalid Request: "id" must be a string or number.');
  try {
    return { jsonrpc: '2.0', id, result: dispatch(message.method, message.params, options) };
  } catch (error) {
    if (error instanceof RpcError) return failure(id, error.code, error.message);
    const detail = error instanceof Error ? error : new Error(String(error));
    (options.log ?? defaultLog)(`request ${message.method} failed: ${detail.stack ?? detail.message}`);
    return failure(id, INTERNAL_ERROR, `Internal error: ${detail.message}`);
  }
}

/** Handles one frame of text (a single message or a batch). Returns the serialized response, or null when none is due. */
export function handlePayload(text: string, options: ServerOptions = {}): string | null {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return JSON.stringify(failure(null, PARSE_ERROR, 'Parse error: the frame is not valid JSON.')); }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return JSON.stringify(failure(null, INVALID_REQUEST, 'Invalid Request: empty batch.'));
    const responses = parsed.map(item => handleMessage(item, options)).filter((item): item is RpcResponse => item !== null);
    return responses.length ? JSON.stringify(responses) : null;
  }
  const response = handleMessage(parsed, options);
  return response ? JSON.stringify(response) : null;
}

/* ---------- Framing ---------- */

export type Framing = 'line' | 'header';
export interface Frame { text: string; framing: Framing; /** Set when the bytes could not form a frame. */ error?: string }
const WHITESPACE = new Set([0x09, 0x0a, 0x0d, 0x20]);
const HEADER_NAME = 'content-length:';

/**
 * Splits a byte stream into messages. Accepts newline-delimited JSON and `Content-Length` frames, mixed.
 * Bytes are decoded only after a whole frame is present, so multi-byte characters can span chunks.
 */
export class FrameReader {
  private buffer: Buffer = Buffer.alloc(0);

  push(chunk: Buffer | string): Frame[] {
    this.buffer = Buffer.concat([this.buffer, typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk]);
    return this.drain(false);
  }
  /** Call when the input closed; yields a final line that had no terminating newline. */
  end(): Frame[] { return this.drain(true); }

  private drain(final: boolean): Frame[] {
    const frames: Frame[] = [];
    for (let frame = this.next(final); frame; frame = this.next(final)) frames.push(frame);
    return frames;
  }
  private discard(error: string, framing: Framing): Frame {
    this.buffer = Buffer.alloc(0);
    return { text: '', framing, error };
  }
  private next(final: boolean): Frame | undefined {
    let start = 0;
    while (start < this.buffer.length && WHITESPACE.has(this.buffer[start])) start++;
    if (start) this.buffer = this.buffer.subarray(start);
    const buffer = this.buffer;
    if (!buffer.length) return undefined;
    const lead = buffer.subarray(0, HEADER_NAME.length).toString('latin1').toLowerCase();
    const maybeHeader = buffer[0] !== 0x7b && buffer[0] !== 0x5b && lead === HEADER_NAME.slice(0, lead.length);
    if (maybeHeader) {
      if (lead.length < HEADER_NAME.length) return final ? this.discard('Incomplete Content-Length header.', 'header') : undefined;
      const crlf = buffer.indexOf('\r\n\r\n'), lf = buffer.indexOf('\n\n');
      const end = crlf >= 0 && (lf < 0 || crlf < lf) ? crlf : lf;
      const separator = end === crlf ? 4 : 2;
      if (end < 0) {
        if (buffer.length > MAX_HEADER_BYTES) return this.discard('Content-Length header is too long.', 'header');
        return final ? this.discard('Incomplete Content-Length header.', 'header') : undefined;
      }
      const length = /^content-length:[ \t]*(\d+)[ \t]*$/im.exec(buffer.subarray(0, end).toString('latin1'))?.[1];
      if (length === undefined) return this.discard('Invalid Content-Length header.', 'header');
      const size = Number(length);
      if (size > MAX_FRAME_BYTES) return this.discard('Frame is too large.', 'header');
      const bodyStart = end + separator;
      if (buffer.length < bodyStart + size) return final ? this.discard('Truncated frame body.', 'header') : undefined;
      this.buffer = buffer.subarray(bodyStart + size);
      return { text: buffer.subarray(bodyStart, bodyStart + size).toString('utf8'), framing: 'header' };
    }
    const newline = buffer.indexOf(0x0a);
    if (newline < 0) {
      if (buffer.length > MAX_FRAME_BYTES) return this.discard('Frame is too large.', 'line');
      if (!final) return undefined;
      this.buffer = Buffer.alloc(0);
      return { text: buffer.toString('utf8').trim(), framing: 'line' };
    }
    this.buffer = buffer.subarray(newline + 1);
    return { text: buffer.subarray(0, newline).toString('utf8').trim(), framing: 'line' };
  }
}

export function encodeFrame(text: string, framing: Framing): Buffer {
  const body = Buffer.from(text, 'utf8');
  return framing === 'header' ? Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'ascii'), body]) : Buffer.concat([body, Buffer.from('\n')]);
}

/* ---------- stdio runner ---------- */

export interface RunOptions extends ServerOptions {
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
  /** Defaults to true when writing to the real stdout, so a stray console.log cannot corrupt the protocol stream. */
  redirectConsole?: boolean;
}

/** Serves requests until the input closes. It never calls `process.exit`, so pending writes finish. */
export function runStdioServer(options: RunOptions = {}): Promise<void> {
  const stdin = options.stdin ?? process.stdin;
  const stdout = options.stdout ?? process.stdout;
  const log = options.log ?? defaultLog;
  if (options.redirectConsole ?? stdout === process.stdout) {
    const toStderr = (...args: unknown[]) => log(format(...args));
    console.log = console.info = console.debug = toStderr;
  }
  const serverOptions: ServerOptions = { context: options.context, log };
  const reader = new FrameReader();
  const answer = (frame: Frame) => {
    const reply = frame.error ? JSON.stringify(failure(null, PARSE_ERROR, `Parse error: ${frame.error}`)) : handlePayload(frame.text, serverOptions);
    if (reply !== null) stdout.write(encodeFrame(reply, frame.framing));
  };
  return new Promise<void>(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    stdout.on('error', error => { log(`stdout error: ${error.message}`); finish(); });
    stdin.on('error', error => { log(`stdin error: ${error.message}`); finish(); });
    stdin.on('data', chunk => { if (!done) reader.push(chunk as Buffer | string).forEach(answer); });
    stdin.on('end', () => { if (!done) reader.end().forEach(answer); finish(); });
    log(`${SERVER_INFO.name} ${SERVER_INFO.version} ready (${TOOLS.length} tools)`);
  });
}

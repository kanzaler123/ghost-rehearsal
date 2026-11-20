#!/usr/bin/env node
// Starts the development-time Ghost Rehearsal MCP server (stdio).
// Compiles scripts/mcp/server.ts with the installed rolldown into node_modules/.cache and reuses that file
// until a bundled module, this launcher or rolldown changes. stdout carries JSON-RPC only; everything else goes to stderr.
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { format } from 'node:util';

const self = fileURLToPath(import.meta.url);
const root = process.env.GHOST_REHEARSAL_ROOT || resolve(dirname(self), '..');
const entry = join(root, 'scripts', 'mcp', 'server.ts');
const cacheDir = join(root, 'node_modules', '.cache');
const bundlePath = join(cacheDir, 'ghost-rehearsal-mcp.mjs');
const manifestPath = join(cacheDir, 'ghost-rehearsal-mcp.manifest.json');

const log = message => process.stderr.write(`[ghost-rehearsal-mcp] ${message}\n`);
// Nothing may print to stdout except the protocol layer.
console.log = console.info = console.debug = (...args) => log(format(...args));

function rolldownVersion() {
  try { return JSON.parse(readFileSync(join(root, 'node_modules', 'rolldown', 'package.json'), 'utf8')).version; } catch { return null; }
}

function isFresh() {
  if (!existsSync(bundlePath) || !existsSync(manifestPath)) return false;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.rolldown !== rolldownVersion() || manifest.launcher !== statSync(self).mtimeMs) return false;
    if (!Array.isArray(manifest.modules) || !manifest.modules.includes(entry)) return false;
    // A module changed after the build started, or disappeared: the bundle is stale.
    return manifest.modules.every(file => statSync(file).mtimeMs <= manifest.startedAt);
  } catch { return false; }
}

async function build() {
  let rolldown;
  try { ({ rolldown } = await import('rolldown')); } catch (error) {
    throw new Error(`The "rolldown" package is not installed (it ships with vite). Run "npm install" first. ${error instanceof Error ? error.message : error}`);
  }
  const startedAt = Date.now();
  const bundle = await rolldown({
    input: entry,
    platform: 'node',
    onLog: (level, entryLog) => log(`rolldown ${level}: ${entryLog.message}`),
  });
  const temporary = join(cacheDir, `ghost-rehearsal-mcp.${process.pid}.tmp.mjs`);
  mkdirSync(cacheDir, { recursive: true });
  let modules;
  try {
    const { output } = await bundle.write({ file: temporary, format: 'esm', sourcemap: false });
    modules = [...new Set(output.flatMap(chunk => chunk.type === 'chunk' ? chunk.moduleIds : []))].filter(file => !file.startsWith('\0') && existsSync(file));
  } finally {
    await bundle.close();
  }
  if (!modules.includes(entry)) modules.push(entry);
  const manifest = { rolldown: rolldownVersion(), launcher: statSync(self).mtimeMs, startedAt, modules };
  let usable = temporary;
  try {
    renameSync(temporary, bundlePath);
    usable = bundlePath;
    const manifestTemporary = `${manifestPath}.${process.pid}.tmp`;
    writeFileSync(manifestTemporary, JSON.stringify(manifest));
    renameSync(manifestTemporary, manifestPath);
  } catch (error) {
    // Another process may hold the cache file (Windows). This run still uses its own complete build.
    log(`cache not updated: ${error instanceof Error ? error.message : error}`);
  }
  return usable;
}

async function main() {
  const bundleFile = isFresh() ? bundlePath : await build();
  const { runStdioServer } = await import(pathToFileURL(bundleFile).href);
  await runStdioServer({ context: { root } });
}

main().catch(error => {
  log(`failed to start: ${error instanceof Error ? error.stack ?? error.message : error}`);
  process.exitCode = 1;
});

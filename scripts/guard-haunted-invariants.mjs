import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const UI_PATH = /(?:^|[\\/])src[\\/](?:components|app[\\/]styles)[\\/].*\.(?:tsx?|css)$/i;

function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(item => collectStrings(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => collectStrings(item, out));
  return out;
}

let raw = '';
try {
  if (!process.stdin.isTTY) raw = readFileSync(0, 'utf8').trim();
} catch {
  raw = '';
}

if (raw) {
  try {
    const payload = JSON.parse(raw);
    const candidates = collectStrings(payload.tool_input ?? payload.filePath ?? payload.path ?? payload);
    const hasPathLike = candidates.some(text => /[\\/]/.test(text) || /\.\w+$/.test(text));
    if (hasPathLike && !candidates.some(text => UI_PATH.test(text))) process.exit(0);
  } catch {
    // Non-JSON stdin: run the invariant check rather than silently skipping.
  }
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vitest', 'run', 'tests/ui-redesign-equivalence.test.ts', 'tests/ui-styles.test.ts', '--environment', 'node'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);

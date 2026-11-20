import { spawnSync } from 'node:child_process';

const UI_PATH = /(?:^|[\\/])src[\\/](?:components|app[\\/]styles)[\\/].*\.(?:tsx?|css)$/i;
const STDIN_WAIT_MS = 150;

function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(item => collectStrings(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => collectStrings(item, out));
  return out;
}

// Reads stdin for at most `ms`. Resolves with whatever arrived, even if the caller never closes the pipe.
function readStdinBounded(ms) {
  return new Promise(resolve => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      process.stdin.removeAllListeners('data');
      process.stdin.removeAllListeners('end');
      process.stdin.removeAllListeners('error');
      process.stdin.pause();
      resolve(data);
    };
    const timer = setTimeout(finish, ms);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
    process.stdin.resume();
  });
}

function candidatesFromStdin(raw) {
  const text = raw.trim();
  if (!text) return [];
  try {
    const payload = JSON.parse(text);
    return collectStrings(payload.tool_input ?? payload.filePath ?? payload.path ?? payload);
  } catch {
    // Non-JSON stdin: treat each line as a possible path.
    return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  }
}

const args = process.argv.slice(2);
const candidates = args.length > 0 ? args : candidatesFromStdin(await readStdinBounded(STDIN_WAIT_MS));

// Skip only when a real path was given and none of them is a UI file. No path information: run the check.
const hasPathLike = candidates.some(text => /[\\/]/.test(text) || /\.\w+$/.test(text));
if (hasPathLike && !candidates.some(text => UI_PATH.test(text))) {
  console.log('guard-haunted-invariants: no Haunted Stage UI file in input, skipped.');
  process.exit(0);
}

const vitestArgs = ['vitest', 'run', 'tests/ui-redesign-equivalence.test.ts', 'tests/ui-styles.test.ts', '--environment', 'node'];
if (process.env.GUARD_HAUNTED_DRY_RUN === '1') {
  console.log(`guard-haunted-invariants: would run npx ${vitestArgs.join(' ')}`);
  process.exit(0);
}

const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', vitestArgs, {
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: process.platform === 'win32',
});
if (result.error) console.error(`guard-haunted-invariants: ${result.error.message}`);
process.exit(result.status ?? 1);

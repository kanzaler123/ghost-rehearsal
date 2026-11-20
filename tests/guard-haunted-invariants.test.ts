import { spawn } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = 'scripts/guard-haunted-invariants.mjs';

interface Outcome { code: number | null; out: string; ms: number }

// Runs the guard in dry-run mode so the test never launches a nested vitest.
// `stdin`: 'close' ends the pipe at once, 'open' leaves it open, a string writes it then leaves it open.
function run(args: string[], stdin: 'close' | 'open' | string): Promise<Outcome> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, GUARD_HAUNTED_DRY_RUN: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { out += chunk; });
    const killer = setTimeout(() => { child.kill(); reject(new Error('guard blocked on stdin')); }, 4000);
    child.on('close', code => { clearTimeout(killer); resolve({ code, out, ms: Date.now() - started }); });
    if (stdin === 'close') child.stdin.end();
    else if (stdin !== 'open') child.stdin.write(stdin);
  });
}

const RUNS = /would run npx vitest run tests\/ui-redesign-equivalence\.test\.ts tests\/ui-styles\.test\.ts --environment node/;

describe('guard-haunted-invariants script', () => {
  it('runs the invariant tests for a matching path argument', async () => {
    for (const path of ['src/app/styles/tokens.css', 'src\\components\\Stage.tsx']) {
      const r = await run([path], 'open');
      expect(r.code).toBe(0);
      expect(r.out).toMatch(RUNS);
    }
  });

  it('skips a non-UI path argument without running vitest', async () => {
    for (const path of ['README.md', 'src/simulation/engine.ts', 'src/components/readme.md']) {
      const r = await run([path], 'open');
      expect(r.code).toBe(0);
      expect(r.out).not.toMatch(RUNS);
      expect(r.out).toMatch(/skipped/);
    }
  });

  it('reads a JSON path from stdin that is written but never closed', async () => {
    const match = await run([], JSON.stringify({ filePath: 'src/components/App.tsx' }));
    expect(match.out).toMatch(RUNS);
    const skip = await run([], JSON.stringify({ filePath: 'README.md' }));
    expect(skip.code).toBe(0);
    expect(skip.out).not.toMatch(RUNS);
  });

  it('runs the check when stdin is empty and closed', async () => {
    const r = await run([], 'close');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(RUNS);
  });

  it('does not block on an open stdin that sends nothing', async () => {
    const r = await run([], 'open');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(RUNS);
    expect(r.ms).toBeLessThan(3500);
  });
});

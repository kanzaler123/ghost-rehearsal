import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const requiredJobs = ['quality', 'chromium', 'chromium-touch', 'webkit', 'firefox', 'import-webkit', 'comparison-webkit'];

export function releaseDecision(needs, event, ref) {
  for (const job of requiredJobs) {
    if (needs[job]?.result !== 'success') throw new Error(`Required job ${job}: ${needs[job]?.result ?? 'missing'}`);
  }
  return ref === 'refs/heads/main' && (event === 'push' || event === 'workflow_dispatch');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const deploy = releaseDecision(JSON.parse(process.env.REQUIRED_JOB_RESULTS ?? '{}'), process.env.GITHUB_EVENT_NAME, process.env.GITHUB_REF);
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required.');
  appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${deploy}\n`);
  console.log(`All required checks succeeded. Deployment eligible: ${deploy}.`);
}

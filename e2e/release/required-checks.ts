import type { FullConfig, FullResult, Reporter, Suite } from '@playwright/test/reporter';

export default class RequiredChecks implements Reporter {
  private suite?: Suite;

  onBegin(_config: FullConfig, suite: Suite) { this.suite = suite; }

  async onEnd(result: FullResult): Promise<{ status: 'failed' } | undefined> {
    const tests = this.suite?.allTests() ?? [];
    let required = 0;
    const incomplete: string[] = [];
    for (const test of tests) {
      const optionalCapture = !process.env.CAPTURE && /[\\/]ui[\\/]capture\.spec\.ts$/.test(test.location.file)
        && test.title === 'capture matching UI review states' && test.expectedStatus === 'skipped'
        && test.results.length === 1 && test.results[0].status === 'skipped';
      if (optionalCapture) continue;
      required++;
      if (test.expectedStatus !== 'passed' || test.results.length !== 1 || test.results[0].status !== 'passed' || test.results[0].retry !== 0) {
        incomplete.push(test.titlePath().join(' > '));
      }
    }
    if (result.status !== 'passed' || !required || incomplete.length) {
      console.error(`Required browser checks did not complete successfully (${result.status}, ${required} required).\n${incomplete.join('\n')}`);
      return { status: 'failed' };
    }
  }
}

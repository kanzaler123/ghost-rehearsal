import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import example from '../examples/open-house.json';
import { projectDocumentSchema } from '../src/schemas';
import { simulate } from '../src/simulation/engine';
import { createPackingExperiment } from '../src/features/project';
import { MESSAGES } from '../src/i18n/messages';

it('preserves the baseline A/B/C recordings and statistics in both run scopes', () => {
  const document = projectDocumentSchema.parse(example);
  const plans = [...document.plans, createPackingExperiment(document.plans[1], new Set(document.plans.map(plan => plan.id)), MESSAGES.en)!];
  const digests = (['cutoff', 'run_to_completion'] as const).flatMap(runMode => plans.map(plan => {
    const { request: _request, ...result } = simulate({ schemaVersion: 1, plan, scenario: document.scenarios[0], runMode });
    return createHash('sha256').update(JSON.stringify(result)).digest('hex');
  }));
  expect(digests).toMatchInlineSnapshot(`
    [
      "df372d76f1fb229fb7cf8b26bd0d957b4c6cc3bfe45ed47a7e1006c047bc6ac6",
      "e7d4e0dccb208abfe9e1760d3ab97d0df7744c56922adc215ff7bfba80fb89f1",
      "edf30f86b6bd6807e452d727877ef99f0852fcf520a08079f84f3114abc74462",
      "84ee5ea04ef52c06dee8fd56d098b163e058008979c81799e988d91e750ebb51",
      "e7be210f89f9c6824efaa39387704507bcc3172ca306c9ef88f7c6322457d9fe",
      "496a9b62f6790b6c9c5b3bdc40e55a0aa95f9dd2b5017a741050355170ff51f2",
    ]
  `);
});

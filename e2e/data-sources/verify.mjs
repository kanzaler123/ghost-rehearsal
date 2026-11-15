import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const evidence = resolve(root, 'docs/reviews/measured-inputs-evidence');
const url = process.env.DATA_SOURCES_URL ?? 'http://127.0.0.1:4186/labs/data-sources.html';
const copy = {
  en: { arrival: 'Arrival data', service: 'Service samples', text: 'CSV or pasted table', unit: 'Time unit', file: 'CSV file', preview: 'Preview', apply: 'Apply data', cancel: 'Cancel import', kind: 'Source kind', source: 'Source', notes: 'Notes', errors: 'Import errors', converted: 'Converted values (seconds)', template: 'Download CSV template', stream: 'Target stream', node: 'Service node', commit: 'Apply project', discard: 'Discard draft', export: 'Export project', total: 'Data rows', valid: 'Valid rows', early: 'Earliest arrival (seconds)', late: 'Latest arrival (seconds)', before: 'At or before cutoff', after: 'After cutoff', horizon: 'After horizon', samples: 'Samples', min: 'Minimum (seconds)', max: 'Maximum (seconds)', mean: 'Arithmetic mean (seconds)' },
  zh: { arrival: '到达记录', service: '服务耗时样本', text: 'CSV 或粘贴表格', unit: '时间单位', file: 'CSV 文件', preview: '预览', apply: '应用数据', cancel: '取消导入', kind: '来源类型', source: '来源', notes: '说明', errors: '导入错误', converted: '转换后的数值（秒）', template: '下载 CSV 模板', stream: '目标群体', node: '服务节点', commit: '应用项目', discard: '放弃草稿', export: '导出项目', total: '数据行数', valid: '合法行数', early: '最早到达（秒）', late: '最晚到达（秒）', before: '观察截止及之前', after: '观察截止之后', horizon: '运行上限之后', samples: '样本数', min: '最小值（秒）', max: '最大值（秒）', mean: '算术平均值（秒）' },
};
const arrivalCsv = 'id,arrival_time,attr:ticket,attr:visit\nguest-1,0,regular,full\nguest-2,1.5,vip,quick\nguest-3,30,regular,full\nguest-4,31,vip,quick\nguest-5,121,regular,full\n';
const simpleArrivalCsv = 'id,arrival_time,attr:ticket,attr:visit\nguest-1,1.5,regular,full\n';
const results = [];
const startedAt = new Date().toISOString();
await mkdir(evidence, { recursive: true });
const browserServer = await chromium.launchServer({ headless: true });
const browser = await chromium.connect(browserServer.wsEndpoint());
const draft = async page => JSON.parse(await page.getByTestId('draft-project').textContent());
const committed = async page => JSON.parse(await page.getByTestId('committed-project').textContent());
const streamOf = document => document.scenarios[0].arrivalStreams.find(stream => stream.id === 'main-stream');
const durationOf = document => document.plans.find(plan => plan.id === 'baseline').graph.nodes.find(node => node.id === 'checkin').duration;
const button = (section, label) => section.getByRole('button', { name: label, exact: true });
const field = (section, label) => ['Time unit', '时间单位', 'Source kind', '来源类型', 'Target stream', '目标群体', 'Service node', '服务节点'].includes(label)
  ? section.getByRole('combobox', { name: label, exact: true })
  : ['CSV file', 'CSV 文件'].includes(label) ? section.getByLabel(label, { exact: true }) : section.getByRole('textbox', { name: label, exact: true });

async function paste(section, t, text, unit = 'seconds') {
  await field(section, t.text).fill(text);
  await field(section, t.unit).selectOption(unit);
  await button(section, t.preview).click();
}

async function summary(section, label, expected) {
  const value = section.locator('dt').filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).locator('xpath=following-sibling::dd[1]');
  await expect(value).toHaveText(String(expected));
}

async function downloadText(page, trigger) {
  const event = page.waitForEvent('download');
  await trigger();
  const download = await event;
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function runCase(profile, name, run) {
  const start = Date.now();
  const context = await browser.newContext({ viewport: profile.viewport, acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const slug = `${profile.name}-${name}`;
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  let failed = false;
  try {
    await page.goto(url, { timeout: 30_000 });
    await page.getByLabel('Language', { exact: true }).selectOption(profile.lang);
    const t = copy[profile.lang];
    const arrival = page.getByRole('region', { name: t.arrival, exact: true });
    const service = page.getByRole('region', { name: t.service, exact: true });
    await expect(arrival).toBeVisible();
    await expect(service).toBeVisible();
    await run({ page, t, arrival, service, profile });
    assert.deepEqual(errors, [], 'No browser errors');
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
    assert.ok(size.scroll <= size.width + 1, `No page overflow: ${JSON.stringify(size)}`);
    results.push({ profile: profile.name, name, status: 'passed', durationMs: Date.now() - start, browserErrors: errors });
    process.stdout.write(`PASS ${slug}\n`);
  } catch (error) {
    failed = true;
    await page.screenshot({ path: resolve(evidence, `${slug}-failure.png`) }).catch(() => {});
    results.push({ profile: profile.name, name, status: 'failed', durationMs: Date.now() - start, error: error.stack ?? String(error), browserErrors: errors });
    process.stderr.write(`FAIL ${slug}: ${error.message}\n`);
  } finally {
    await context.tracing.stop(failed || name === 'outer-commit-export' ? { path: resolve(evidence, `${slug}-trace.zip`) } : {});
    await context.close();
  }
}

const profiles = ['en', 'zh'].flatMap(lang => [
  { name: `desktop-${lang}`, lang, viewport: { width: 1440, height: 1000 } },
  { name: `mobile-${lang}`, lang, viewport: { width: 390, height: 844 } },
]);

try {
  for (const profile of profiles) {
    await runCase(profile, 'errors-and-cancel', async ({ page, t, arrival, service }) => {
      const original = await draft(page);
      assert.equal(await field(arrival, t.unit).inputValue(), '');
      await field(arrival, t.text).fill(simpleArrivalCsv);
      await button(arrival, t.preview).click();
      await expect(button(arrival, t.apply)).toBeDisabled();
      await expect(arrival.getByRole('alert')).toContainText(profile.lang === 'en' ? 'unit' : '单位');
      await paste(arrival, t, 'id,arrival_time,attr:ticket,attr:visit\nguest-1,0,regular,full\nguest-1,-1,vip,quick\nBAD,Infinity,wrong,full\n');
      const errors = arrival.getByRole('table', { name: t.errors, exact: true });
      await expect(errors).toBeVisible();
      await expect(errors).toContainText('3');
      await expect(errors).toContainText('4');
      await expect(button(arrival, t.apply)).toBeDisabled();
      assert.deepEqual(await draft(page), original);
      assert.deepEqual(await committed(page), original);
      await button(arrival, t.cancel).click();
      assert.equal(await field(arrival, t.text).inputValue(), '');
      await paste(service, t, 'duration\n1\n2,3\n');
      await expect(service.getByRole('table', { name: t.errors, exact: true })).toBeVisible();
      await expect(button(service, t.apply)).toBeDisabled();
      await button(service, t.cancel).click();
      assert.deepEqual(await draft(page), original);
    });

    await runCase(profile, 'arrivals-late-and-identity', async ({ page, t, arrival }) => {
      const original = await draft(page);
      const text = '\uFEFF' + arrivalCsv.replace('guest-2', '"guest-2"').replaceAll('\n', '\r\n') + '\r\n';
      await field(arrival, t.file).setInputFiles({ name: 'synthetic-arrivals.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
      await expect(field(arrival, t.text)).toHaveValue(text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n'));
      await field(arrival, t.unit).selectOption('minutes');
      await button(arrival, t.preview).click();
      await summary(arrival, t.total, 5); await summary(arrival, t.valid, 5);
      await summary(arrival, t.early, 0); await summary(arrival, t.late, 7260);
      await summary(arrival, t.before, 3); await summary(arrival, t.after, 2); await summary(arrival, t.horizon, 1);
      await expect(arrival.getByRole('table', { name: t.converted, exact: true })).toContainText('90');
      await arrival.screenshot({ path: resolve(evidence, `${profile.name}-arrival-preview.png`) });
      await button(arrival, t.apply).click();
      const next = await draft(page);
      assert.deepEqual(streamOf(next).records.map(record => record.arrivalTime), [0, 90, 1800, 1860, 7260]);
      assert.equal(streamOf(next).id, streamOf(original).id);
      assert.equal(streamOf(next).name, streamOf(original).name);
      assert.equal(streamOf(next).provenance.kind, 'user_estimate');
      assert.deepEqual(next.plans, original.plans);
      assert.deepEqual(next.scenarios[0].attributes, original.scenarios[0].attributes);
      assert.deepEqual(next.scenarios[0].arrivalStreams.find(stream => stream.id === 'side-stream'), original.scenarios[0].arrivalStreams.find(stream => stream.id === 'side-stream'));
      assert.deepEqual(await committed(page), original);
      await expect(button(arrival, t.apply)).toBeDisabled();
      await button(page, t.discard).click();
      assert.deepEqual(await draft(page), original);
    });

    await runCase(profile, 'service-provenance-and-duplicates', async ({ page, t, service }) => {
      const original = await draft(page);
      await paste(service, t, 'duration\n0\n1.5\n1.5\n', 'minutes');
      await summary(service, t.samples, 3); await summary(service, t.min, 0); await summary(service, t.max, 90); await summary(service, t.mean, 60);
      await field(service, t.kind).selectOption('measured');
      await field(service, t.source).fill('Synthetic browser fixture; not real measurement');
      await field(service, t.notes).fill('Synthetic source-retention check');
      await service.screenshot({ path: resolve(evidence, `${profile.name}-service-preview.png`) });
      await button(service, t.apply).click();
      let duration = durationOf(await draft(page));
      assert.deepEqual(duration.samples, [0, 90, 90]);
      assert.equal(duration.provenance.kind, 'measured');
      assert.deepEqual(await committed(page), original);
      await field(service, t.file).setInputFiles({ name: 'synthetic-replacement.csv', mimeType: 'text/csv', buffer: Buffer.from('duration\r\n2\r\n2\r\n0\r\n') });
      await expect(field(service, t.text)).toHaveValue(/2/);
      await field(service, t.unit).selectOption('seconds');
      await button(service, t.preview).click();
      assert.equal(await field(service, t.kind).inputValue(), 'user_estimate');
      assert.equal(await field(service, t.source).inputValue(), duration.provenance.source);
      assert.equal(await field(service, t.notes).inputValue(), duration.provenance.notes);
      await button(service, t.apply).click();
      duration = durationOf(await draft(page));
      assert.deepEqual(duration.samples, [2, 2, 0]);
      assert.equal(duration.provenance.kind, 'user_estimate');
      await paste(service, t, 'duration\n4\n4\n');
      await field(service, t.kind).selectOption('historical');
      await button(service, t.apply).click();
      assert.equal(durationOf(await draft(page)).provenance.kind, 'historical');
      await paste(service, t, 'duration\n5\n');
      assert.equal(await field(service, t.kind).inputValue(), 'user_estimate');
      await field(service, t.source).fill('x'.repeat(1001));
      await expect(button(service, t.apply)).toBeDisabled();
      await expect(field(service, t.source)).toHaveAttribute('aria-invalid', 'true');
      await button(service, t.cancel).click();
      assert.deepEqual(durationOf(await draft(page)).samples, [4, 4]);
      assert.deepEqual(await committed(page), original);
    });

    await runCase(profile, 'metadata-only-edit', async ({ page, t, service }) => {
      const original = await draft(page);
      await paste(service, t, 'duration\n22\n22\n0\n');
      await field(service, t.kind).selectOption('measured');
      await button(service, t.apply).click();
      const before = durationOf(await draft(page));
      await page.getByText(profile.lang === 'en' ? 'Edit existing service source (keep current samples)' : '编辑现有服务来源（不替换样本）', { exact: true }).click();
      const source = page.getByRole('region', { name: profile.lang === 'en' ? 'Existing service source' : '现有服务来源', exact: true });
      const applySource = button(source, profile.lang === 'en' ? 'Apply source to draft' : '应用来源到草稿');
      await field(source, t.source).fill('Synthetic metadata-only fixture');
      await field(source, t.notes).fill('Synthetic description change');
      await applySource.click();
      const after = durationOf(await draft(page));
      assert.deepEqual(after.samples, before.samples);
      assert.equal(after.provenance.kind, 'measured');
      assert.equal(after.provenance.source, 'Synthetic metadata-only fixture');
      assert.equal(after.provenance.notes, 'Synthetic description change');
      assert.deepEqual(await committed(page), original);
      await field(source, t.notes).fill('😀'.repeat(1001));
      await expect(applySource).toBeDisabled();
      await expect(field(source, t.notes)).toHaveAttribute('aria-invalid', 'true');
      await button(source, profile.lang === 'en' ? 'Cancel source edit' : '取消来源编辑').click();
      assert.deepEqual(durationOf(await draft(page)), after);
      assert.equal(await field(source, t.notes).inputValue(), after.provenance.notes);
      await paste(service, t, 'duration\n3\n');
      await button(service, t.apply).click();
      await field(source, t.kind).selectOption('measured');
      await paste(service, t, 'duration\n4\n');
      await button(service, t.apply).click();
      assert.equal(await field(source, t.kind).inputValue(), 'user_estimate');
      await expect(applySource).toBeDisabled();
      assert.deepEqual(durationOf(await draft(page)).samples, [4]);
    });

    await runCase(profile, 'snapshot-and-target-changes', async ({ page, t, arrival, service }) => {
      const original = await draft(page);
      await paste(service, t, 'duration\n1\n');
      await field(service, t.kind).selectOption('measured');
      await field(service, t.text).fill('duration\n7\n');
      await expect(button(service, t.apply)).toBeDisabled();
      assert.equal(await field(service, t.kind).inputValue(), 'user_estimate');
      await button(service, t.preview).click();
      await field(service, t.kind).selectOption('historical');
      await field(service, t.unit).selectOption('minutes');
      await expect(button(service, t.apply)).toBeDisabled();
      assert.equal(await field(service, t.kind).inputValue(), 'user_estimate');
      await button(service, t.preview).click();
      await field(page, t.node).selectOption('packing');
      await expect(button(service, t.apply)).toBeDisabled();
      assert.equal(await field(service, t.text).inputValue(), '');
      await paste(arrival, t, simpleArrivalCsv);
      await field(page, t.stream).selectOption('side-stream');
      await expect(button(arrival, t.apply)).toBeDisabled();
      assert.equal(await field(arrival, t.text).inputValue(), '');
      assert.deepEqual(await draft(page), original);
      assert.deepEqual(await committed(page), original);
    });

    await runCase(profile, 'outer-commit-export', async ({ page, t, arrival, service }) => {
      const original = await draft(page);
      const template = await downloadText(page, () => arrival.getByRole('link', { name: t.template, exact: true }).click());
      assert.equal(template.split(/\r?\n/)[0], 'id,arrival_time,attr:ticket,attr:visit');
      await paste(arrival, t, simpleArrivalCsv.replaceAll(',', '\t'), 'minutes');
      await field(arrival, t.kind).selectOption('historical');
      await field(arrival, t.source).fill('Synthetic archive fixture');
      await field(arrival, t.notes).fill('Not historical event evidence');
      await button(arrival, t.apply).click();
      await paste(service, t, 'duration\n22\n22\n0\n');
      await button(service, t.apply).click();
      const staged = await draft(page);
      const before = JSON.parse(await downloadText(page, () => button(page, t.export).click()));
      assert.deepEqual(before, original);
      await button(page, t.commit).click();
      assert.deepEqual(await committed(page), staged);
      await expect(button(page, t.commit)).toBeDisabled();
      const exportedText = await downloadText(page, () => button(page, t.export).click());
      const exported = JSON.parse(exportedText);
      assert.deepEqual(exported, staged);
      const validation = await page.evaluate(async text => {
        const { parseDocument, serializeDocument } = await import('/src/schemas/index.ts');
        const parsed = parseDocument(text);
        return { errors: parsed.issues.filter(issue => issue.severity === 'error'), roundtrip: parsed.document ? serializeDocument(parsed.document) : null };
      }, exportedText);
      assert.deepEqual(validation.errors, []);
      assert.equal(validation.roundtrip, exportedText);
      assert.equal(streamOf(exported).provenance.kind, 'historical');
      assert.equal(streamOf(exported).provenance.source, 'Synthetic archive fixture');
      assert.equal(streamOf(exported).provenance.notes, 'Not historical event evidence');
      assert.deepEqual(durationOf(exported).samples, [22, 22, 0]);
      await button(page, t.discard).click();
      assert.deepEqual(await draft(page), exported);
    });

    await runCase(profile, 'file-read-cancel-and-replacement', async ({ page, t, service }) => {
      const original = await draft(page);
      await page.evaluate(() => {
        const originalText = File.prototype.text;
        File.prototype.text = function () {
          return this.name === 'synthetic-slow.csv'
            ? new Promise(resolve => setTimeout(() => originalText.call(this).then(resolve), 500))
            : originalText.call(this);
        };
      });
      await field(service, t.file).setInputFiles({ name: 'synthetic-slow.csv', mimeType: 'text/csv', buffer: Buffer.from('duration\n99\n') });
      await button(service, t.cancel).click();
      await page.waitForTimeout(600);
      assert.equal(await field(service, t.text).inputValue(), '');
      await field(service, t.file).setInputFiles({ name: 'synthetic-slow.csv', mimeType: 'text/csv', buffer: Buffer.from('duration\n99\n') });
      await field(service, t.text).fill('duration\n3\n');
      await page.waitForTimeout(600);
      assert.equal(await field(service, t.text).inputValue(), 'duration\n3\n');
      await field(service, t.unit).selectOption('seconds');
      await button(service, t.preview).click();
      await button(service, t.apply).click();
      assert.deepEqual(durationOf(await draft(page)).samples, [3]);
      assert.deepEqual(await committed(page), original);
    });
  }

  for (const lang of ['en', 'zh']) {
    await runCase({ name: `short-${lang}`, lang, viewport: { width: 390, height: 568 } }, 'keyboard-import', async ({ page, t, service, profile }) => {
      await field(service, t.text).focus();
      await page.keyboard.insertText('duration\n0\n1.5\n1.5\n');
      await page.keyboard.press('Tab');
      await expect(field(service, t.unit)).toBeFocused();
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      assert.equal(await field(service, t.unit).inputValue(), 'minutes');
      const preview = button(service, t.preview);
      for (let index = 0; index < 12 && !await preview.evaluate(element => element === document.activeElement); index++) await page.keyboard.press('Tab');
      await expect(preview).toBeFocused();
      await page.keyboard.press('Enter');
      await summary(service, t.mean, 60);
      const apply = button(service, t.apply);
      for (let index = 0; index < 16 && !await apply.evaluate(element => element === document.activeElement); index++) await page.keyboard.press('Tab');
      await expect(apply).toBeFocused();
      const bounds = await apply.boundingBox();
      assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= profile.viewport.height, 'Keyboard scrolls Apply into view');
      await page.screenshot({ path: resolve(evidence, `${profile.name}-keyboard-apply.png`) });
      await page.keyboard.press('Enter');
      assert.deepEqual(durationOf(await draft(page)).samples, [0, 90, 90]);
      assert.notEqual(durationOf(await committed(page)).kind, 'empirical');
    });
  }
} finally {
  const report = { startedAt, finishedAt: new Date().toISOString(), url, fixture: 'Synthetic test data only; not real-event validation', browser: 'Chromium', retries: 0, passed: results.filter(result => result.status === 'passed').length, failed: results.filter(result => result.status === 'failed').length, results, cleanup: 'pending' };
  await writeFile(resolve(evidence, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(`${report.passed} passed; ${report.failed} failed\n`);
  if (report.failed) process.exitCode = 1;
  let cleanupTimer;
  try {
    await browser.close();
    await Promise.race([
      browserServer.close(),
      new Promise((_, reject) => { cleanupTimer = setTimeout(() => reject(new Error('Chromium cleanup exceeded 15 seconds')), 15_000); }),
    ]);
    report.cleanup = 'complete';
  } catch (error) {
    report.cleanup = error.message;
    browserServer.process().kill();
    process.exitCode = 1;
    process.stderr.write(`HARNESS ERROR: ${report.cleanup}\n`);
  } finally {
    clearTimeout(cleanupTimer);
    await writeFile(resolve(evidence, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
    if (report.cleanup !== 'complete') process.exit(1);
  }
}

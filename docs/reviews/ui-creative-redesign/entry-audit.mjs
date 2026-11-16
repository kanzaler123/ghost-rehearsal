import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

const browser = await chromium.launch();
const results = [];
try {
  for (const phase of ['before', 'after']) {
    const port = phase === 'before' ? 4192 : 4193;
    const dist = phase === 'before' ? 'C:/Users/kanzaler/AppData/Local/Temp/ghost-rehearsal-before-dist-20261116' : 'dist';
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) for (const lang of ['en', 'zh']) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [], resources = new Set();
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => resources.add(response.url()));
      await page.addInitScript(lang => {
        localStorage.setItem('ghost-rehearsal.lang', lang);
        window.entryShifts = [];
        new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.entryShifts.push(entry.value); }).observe({ type: 'layout-shift', buffered: true });
      }, lang);
      await page.goto(`http://127.0.0.1:${port}/ghost-rehearsal/`);
      await page.waitForTimeout(5000);
      const layout = await page.evaluate(() => ({ cls: window.entryShifts.reduce((a, b) => a + b, 0), rootOverflow: document.documentElement.scrollWidth > innerWidth, documentLanguage: document.documentElement.lang, focus: document.activeElement?.textContent }));
      let javascriptGzip = 0, cssGzip = 0, binary = 0;
      const files = [];
      for (const resource of resources) {
        const pathname = new URL(resource).pathname.replace('/ghost-rehearsal/', '');
        if (!pathname || pathname.endsWith('.html')) continue;
        const bytes = await readFile(`${dist}/${pathname}`);
        files.push(pathname);
        if (pathname.endsWith('.js')) javascriptGzip += gzipSync(bytes).length;
        else if (pathname.endsWith('.css')) cssGzip += gzipSync(bytes).length;
        else binary += bytes.length;
      }
      results.push({ phase, viewport, lang, ...layout, javascriptGzip, cssGzip, binary, files, errors });
      await context.close();
    }
  }
} finally {
  await browser.close();
  const report = { time: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(), results };
  await writeFile('docs/reviews/ui-creative-redesign/entry-audit.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(results.map(({ files, focus, ...result }) => result), null, 2));
}

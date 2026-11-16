import { storedProject } from '../persistence/browser';
import { expect, test } from '@playwright/test';
import { MESSAGES } from '../../src/i18n/messages';

for (const viewport of [{ width: 390, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 720 }]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });
    test('import errors isolate workbench shortcuts and restore a visible fallback', async ({ page }, info) => {
      const t = MESSAGES[info.project.name.endsWith('zh') ? 'zh' : 'en'];
      await page.addInitScript(lang => localStorage.setItem('ghost-rehearsal.lang', lang), t.lang);
      await page.goto('./');
      await page.getByRole('button', { name: t.eventSetup.demo, exact: true }).click();
      await page.getByRole('tab', { name: t.modes.Build, exact: true }).click();
      if (await page.getByRole('button', { name: t.studioUi.expandPlans, exact: true }).isVisible()) await page.getByRole('button', { name: t.studioUi.expandPlans, exact: true }).click();
      await page.locator('.event-picker summary').click();
      await page.getByRole('button', { name: t.eventSetup.settings, exact: true }).click();
      await page.getByRole('textbox', { name: t.dialogs.eventName, exact: true }).fill('Keyboard isolation');
      await page.getByRole('button', { name: t.dialogs.applyShared(2), exact: true }).click();
      const saved = await storedProject(page, 'saved');
      await page.getByLabel(t.header.more, { exact: true }).click();
      const picker = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: t.header.import, exact: true }).click();
      await (await picker).setFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
      const error = page.getByRole('dialog', { name: t.stage.checksTitle });
      await expect(error).toBeVisible();
      const close = error.getByRole('button', { name: t.common.closeDialog });
      await page.getByRole('button', { name: t.header.undo, exact: true, includeHidden: true }).evaluate(element => (element as HTMLElement).focus());
      await expect(close).toBeFocused();
      await page.keyboard.press('Control+z');
      await page.keyboard.press('Control+s');
      expect(await storedProject(page, 'saved')).toBe(saved);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByLabel(t.eventSetup.active)).toContainText('Keyboard isolation');
      expect(await page.evaluate(() => {
        const active = document.activeElement as HTMLElement;
        return active !== document.body && active.getClientRects().length > 0 && !active.closest('[hidden], [inert]');
      })).toBe(true);
    });
  });
}

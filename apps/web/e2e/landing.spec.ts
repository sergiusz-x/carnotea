import { expect, test } from '@playwright/test';

test.describe('Public landing', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('carnotea.lang', 'en');
      localStorage.setItem('theme', 'dark');
    });
  });

  test('remains usable without horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Everything important about your car. In one place.' }),
    ).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create an account' }).first()).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('opens the real product preview and links directly to sign-up', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('button', { name: /Enlarge application screenshot/ })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.getByRole('link', { name: 'Create an account' }).first().click();
    await expect(page).toHaveURL(/\/login\?mode=signUp$/);
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
  });
});

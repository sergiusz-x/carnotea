import { test, expect } from './fixtures/db-helpers';

test.describe('Critical path', () => {
  test('sign in, create vehicle, add fuel log, see on dashboard', async ({ page, testUser }) => {
    // 1. Sign up via UI
    await page.goto('/login');
    await page.getByText("Don't have an account? Sign up").click();
    await page.getByLabel('Full name').fill(testUser.name);
    await page.getByLabel('Email').fill(testUser.email);
    await page.getByLabel('Password').fill(testUser.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    // 2. Verify successful sign-up / sign-in
    await expect(page).toHaveURL(/\/dashboard$/);

    // 4. Create vehicle
    await page.goto('/vehicles');
    // Ensure we are on the empty state or vehicles list
    await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
    await page.getByRole('button', { name: 'Add vehicle' }).click();

    // Fill vehicle form
    await page.getByLabel('Make').fill('Toyota');
    await page.getByLabel('Model').fill('Corolla');
    await page.getByLabel('Year').fill('2020');
    await page.getByLabel('Fuel type').click();
    await page.getByRole('option', { name: 'Petrol' }).click();
    await page.getByRole('button', { name: 'Save vehicle' }).click();

    // Verify vehicle created
    await expect(page.getByRole('button', { name: 'Toyota Corolla' })).toBeVisible();

    // 5. Add fuel log
    await page.getByRole('link', { name: 'Fuel', exact: true }).click();

    // Click Add fuel log
    await page.getByRole('button', { name: 'Add fuel log' }).first().click();

    // Wizard or form
    // The translation file has 'wizard' steps: 'When & where?', 'How much?', 'Summary'.
    // If it's a wizard:
    await page.getByLabel('Date').fill('2026-06-15');
    await page.locator('input[type="number"]').fill('50500');
    // Usually next step button is just 'Next' or 'Continue'. Let's look for standard terms or just try to fill.
    // If it's all on one page vs wizard. The translation says "wizard": { "step1": "When & where?"... }
    // Wait, the form might just be standard AppForm with wizard steps inside.
    // Let's assume standard 'Next' buttons for wizard, or just fill everything if visible.
    const isWizard = await page.getByText('When & where?').isVisible();
    if (isWizard) {
      await page.getByRole('button', { name: 'Next' }).click();
    }

    await page.locator('input[type="number"]').first().fill('40');
    await page.locator('input[type="number"]').nth(1).fill('1.5');

    if (isWizard) {
      await page.getByRole('button', { name: 'Next' }).click();
    }

    await page.getByRole('button', { name: 'Save fuel log' }).click();

    // Verify fuel log created
    await expect(page.getByText('50500 km')).toBeVisible();

    // 6. Dashboard
    await page.goto('/');
    // Check for the vehicle on the dashboard
    await expect(page.getByRole('button', { name: 'Toyota Corolla' })).toBeVisible();
  });
});

import { test, expect } from './fixtures/db-helpers';

test.describe('Critical path', () => {
  test('sign in, create vehicle, add fuel log, see on dashboard', async ({ page, testUser, request }) => {
    // 1. Setup: create user via API
    const res = await request.post('/api/auth/sign-up/email', {
      data: {
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
      },
    });
    if (!res.ok()) {
      console.error('Sign up failed', await res.text());
    }
    expect(res.ok()).toBeTruthy();
    
    // Some setups might log in automatically or not, but we still hit the login page
    // to prove the UI flow works.
    
    // Sign out just in case the API call set a cookie in the context
    await request.post('/api/auth/sign-out');

    // 2. Sign in via UI
    await page.goto('/login');
    await page.getByLabel('Email').fill(testUser.email);
    await page.getByLabel('Password').fill(testUser.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    // 3. Verify successful sign-in
    // Should navigate away from login and not show the sign in button
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(0);

    // 4. Create vehicle
    await page.goto('/vehicles');
    // Ensure we are on the empty state or vehicles list
    await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
    await page.getByRole('button', { name: 'Add vehicle' }).click();

    // Fill vehicle form
    await page.getByLabel('Make').fill('Toyota');
    await page.getByLabel('Model').fill('Corolla');
    await page.getByLabel('Year').fill('2020');
    await page.getByLabel('Fuel type').selectOption({ label: 'Petrol' });
    await page.getByLabel('Current mileage').fill('50000');
    
    await page.getByRole('button', { name: 'Save vehicle' }).click();

    // Verify vehicle created
    await expect(page.getByText('Toyota Corolla')).toBeVisible();

    // 5. Add fuel log
    // Click on the vehicle row/card
    await page.getByText('Toyota Corolla').click();
    
    // In detail view, switch to Fuel logs tab if there is one
    await page.getByRole('tab', { name: 'Fuel logs' }).click();
    
    // Click Add fuel log
    await page.getByRole('button', { name: 'Add fuel log' }).click();

    // Wizard or form
    // The translation file has 'wizard' steps: 'When & where?', 'How much?', 'Summary'.
    // If it's a wizard:
    await page.getByLabel('Date').fill('2026-06-15');
    await page.getByLabel('Mileage (km)').fill('50500');
    // Usually next step button is just 'Next' or 'Continue'. Let's look for standard terms or just try to fill.
    // If it's all on one page vs wizard. The translation says "wizard": { "step1": "When & where?"... }
    // Wait, the form might just be standard AppForm with wizard steps inside.
    // Let's assume standard 'Next' buttons for wizard, or just fill everything if visible.
    const isWizard = await page.getByText('When & where?').isVisible();
    if (isWizard) {
      await page.getByRole('button', { name: 'Next' }).click();
    }
    
    await page.getByLabel('Liters').fill('40');
    await page.getByLabel('Price per liter').fill('1.5');
    
    if (isWizard) {
      await page.getByRole('button', { name: 'Next' }).click();
    }

    await page.getByRole('button', { name: 'Save fuel log' }).click();

    // Verify fuel log created
    await expect(page.getByText('50500 km')).toBeVisible();

    // 6. Dashboard
    await page.goto('/');
    // Check for the vehicle on the dashboard
    await expect(page.getByText('Toyota Corolla')).toBeVisible();
  });
});

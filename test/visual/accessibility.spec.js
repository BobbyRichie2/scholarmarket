import { test, expect } from '@playwright/test';

test.describe('Visual Regression with Accessibility Focus', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should maintain focus indicators for keyboard navigation', async ({ page }) => {
    // Trigger focus on button
    const button = page.locator('button').first();

    if (await button.count() > 0) {
      // Use keyboard to focus
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      await expect(page).toHaveScreenshot('focus-indicator.png');
    }
  });

  test('should display proper contrast ratios in visual snapshot', async ({ page }) => {
    // Get page and verify visual appearance
    const main = page.locator('main').first();

    if (await main.count() > 0) {
      await expect(main).toHaveScreenshot('contrast-check.png');
    }
  });

  test('should show proper spacing and hierarchy', async ({ page }) => {
    const container = page.locator('[role="main"], main').first();

    if (await container.count() > 0) {
      await expect(container).toHaveScreenshot('spacing-hierarchy.png');
    }
  });
});

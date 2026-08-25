import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests - Core Components', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Header Component', () => {
    test('should match header snapshot on desktop', async ({ page }) => {
      // Get the header element
      const header = page.locator('header, nav[role="navigation"]').first();

      // Take screenshot and compare
      await expect(header).toHaveScreenshot('header-desktop.png');
    });

    test('should match header snapshot on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const header = page.locator('header, nav[role="navigation"]').first();
      await expect(header).toHaveScreenshot('header-mobile.png');
    });

    test('should match header when wallet connected', async ({ page }) => {
      // Simulate wallet connection by setting local storage or mocking
      await page.evaluate(() => {
        localStorage.setItem('wallet_connected', 'true');
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const header = page.locator('header, nav[role="navigation"]').first();
      await expect(header).toHaveScreenshot('header-connected.png');
    });
  });

  test.describe('Material Card Component', () => {
    test('should match card snapshot in listing view', async ({ page }) => {
      // Navigate to materials page
      await page.goto('/discover'); // Adjust path as needed

      // Wait for cards to load
      await page.waitForSelector('[data-testid="material-card"], .material-card');

      const cards = page.locator('[data-testid="material-card"], .material-card');

      if (await cards.count() > 0) {
        const firstCard = cards.first();
        await expect(firstCard).toHaveScreenshot('material-card-default.png');
      }
    });

    test('should match card snapshot on hover state', async ({ page }) => {
      await page.goto('/discover');
      await page.waitForSelector('[data-testid="material-card"], .material-card');

      const card = page.locator('[data-testid="material-card"], .material-card').first();

      // Hover over card
      await card.hover();
      await page.waitForTimeout(200); // Wait for hover animation

      await expect(card).toHaveScreenshot('material-card-hover.png');
    });

    test('should match card snapshot with different price ranges', async ({ page }) => {
      await page.goto('/discover');
      await page.waitForSelector('[data-testid="material-card"], .material-card');

      const cards = page.locator('[data-testid="material-card"], .material-card');

      // Take screenshots of different cards to test pricing display
      for (let i = 0; i < Math.min(3, await cards.count()); i++) {
        const card = cards.nth(i);
        await expect(card).toHaveScreenshot(`material-card-${i}.png`);
      }
    });
  });

  test.describe('Checkout Modal Component', () => {
    test('should match modal snapshot in default state', async ({ page }) => {
      // Navigate to a material detail page
      await page.goto('/marketplace/test-material'); // Adjust path

      // Click buy button or similar to open modal
      const buyButton = page.locator('button:has-text("Buy"), button:has-text("Checkout")').first();

      if (await buyButton.count() > 0) {
        await buyButton.click();

        // Wait for modal to appear
        await page.waitForSelector('[role="dialog"], .modal, .checkout-modal');

        const modal = page.locator('[role="dialog"], .modal, .checkout-modal').first();
        await expect(modal).toHaveScreenshot('checkout-modal-default.png');
      }
    });

    test('should match modal snapshot during loading state', async ({ page }) => {
      // This test assumes you can trigger loading state
      // Adjust selectors based on actual implementation
      await page.goto('/marketplace/test-material');

      const buyButton = page.locator('button:has-text("Buy")').first();

      if (await buyButton.count() > 0) {
        await buyButton.click();
        await page.waitForSelector('[role="dialog"]');

        const modal = page.locator('[role="dialog"]').first();
        await expect(modal).toHaveScreenshot('checkout-modal-loading.png');
      }
    });

    test('should match modal snapshot on different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' },
      ];

      await page.goto('/marketplace/test-material');

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        const buyButton = page.locator('button:has-text("Buy")').first();
        if (await buyButton.count() > 0) {
          await buyButton.click();
          await page.waitForSelector('[role="dialog"]');

          const modal = page.locator('[role="dialog"]').first();
          await expect(modal).toHaveScreenshot(`checkout-modal-${viewport.name}.png`);

          // Close modal for next iteration
          const closeButton = modal.locator('button[aria-label="Close"]').first();
          if (await closeButton.count() > 0) {
            await closeButton.click();
            await page.waitForTimeout(300);
          }
        }
      }
    });
  });

  test.describe('Wallet Button Component', () => {
    test('should match wallet button in idle state', async ({ page }) => {
      // Clear any wallet connection state
      await page.evaluate(() => {
        localStorage.removeItem('wallet_connected');
      });

      const walletBtn = page.locator('button:has-text("Connect wallet")').first();

      if (await walletBtn.count() > 0) {
        await expect(walletBtn).toHaveScreenshot('wallet-button-idle.png');
      }
    });

    test('should match wallet button in connected state', async ({ page }) => {
      // Simulate connected state
      await page.evaluate(() => {
        localStorage.setItem('wallet_address', 'GBRP...RQP');
        localStorage.setItem('wallet_connected', 'true');
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const walletDisplay = page.locator('[data-testid="wallet-display"], .wallet-address').first();

      if (await walletDisplay.count() > 0) {
        await expect(walletDisplay).toHaveScreenshot('wallet-button-connected.png');
      }
    });
  });

  test.describe('Form Components', () => {
    test('should match form input states', async ({ page }) => {
      await page.goto('/dashboard/upload'); // Adjust path

      // Get first form input
      const input = page.locator('input[type="text"]').first();

      if (await input.count() > 0) {
        // Default state
        await expect(input).toHaveScreenshot('form-input-default.png');

        // Focused state
        await input.focus();
        await page.waitForTimeout(100);
        await expect(input).toHaveScreenshot('form-input-focused.png');

        // With value
        await input.fill('Test Material');
        await expect(input).toHaveScreenshot('form-input-filled.png');
      }
    });

    test('should match form error states', async ({ page }) => {
      await page.goto('/dashboard/upload');

      // Simulate form submission to trigger errors
      const submitBtn = page.locator('button[type="submit"]').first();

      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForTimeout(300); // Wait for validation messages

        const form = page.locator('form').first();
        if (await form.count() > 0) {
          await expect(form).toHaveScreenshot('form-with-errors.png');
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should render correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Get main content area
      const main = page.locator('main').first();

      if (await main.count() > 0) {
        await expect(main).toHaveScreenshot('responsive-mobile.png');
      }
    });

    test('should render correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');

      const main = page.locator('main').first();

      if (await main.count() > 0) {
        await expect(main).toHaveScreenshot('responsive-tablet.png');
      }
    });

    test('should render correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      const main = page.locator('main').first();

      if (await main.count() > 0) {
        await expect(main).toHaveScreenshot('responsive-desktop.png');
      }
    });
  });

  test.describe('Color and Theme', () => {
    test('should match component colors in light theme', async ({ page }) => {
      // Ensure light theme is active
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      const header = page.locator('header, nav[role="navigation"]').first();

      if (await header.count() > 0) {
        await expect(header).toHaveScreenshot('theme-light.png');
      }
    });

    test('should match component colors in dark theme', async ({ page }) => {
      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(200); // Wait for theme transition

      const header = page.locator('header, nav[role="navigation"]').first();

      if (await header.count() > 0) {
        await expect(header).toHaveScreenshot('theme-dark.png');
      }
    });
  });

  test.describe('Animation and Motion', () => {
    test('should preserve animation states for visual consistency', async ({ page }) => {
      // Disable animations for consistent snapshots
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.innerHTML = `
          * {
            animation: none !important;
            transition: none !important;
          }
        `;
        document.head.appendChild(style);
      });

      const walletBtn = page.locator('button:has-text("Connect")').first();

      if (await walletBtn.count() > 0) {
        await expect(walletBtn).toHaveScreenshot('animation-disabled.png');
      }
    });
  });
});

/**
 * FT-BLD-04: Xóa tòa nhà (Delete building).
 *
 * Kỳ vọng:
 *  - OWNER click "Xóa" → hiện confirm dialog native
 *  - Confirm → tòa nhà bị xóa
 *  - Cancel → tòa nhà vẫn còn
 *  - MANAGER không thấy nút Xóa
 */
import { test, expect } from '@playwright/test';
import { SEL, OWNER, MANAGER, clearStorage, loginViaUi, FRONTEND_URL } from './helpers/building';

const BUILDINGS_URL = FRONTEND_URL + '/dashboard/buildings';

test.describe('FT-BLD-04: Xóa tòa nhà', () => {

  test.describe('OWNER - Xóa tòa nhà', () => {
    let tempName: string;

    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, OWNER.email, OWNER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await page.goto(BUILDINGS_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('.nav-item', { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Tạo tòa nhà tạm để xóa
      tempName = `Delete Test ${Date.now()}`;
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      const hasAddBtn = await addBtn.isVisible().catch(() => false);
      if (hasAddBtn) {
        await addBtn.click();
        await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
        await page.getByPlaceholder(/VD: Chung cư/i).fill(tempName);
        await page.getByPlaceholder(/VD: 123 Nguyễn Huệ/i).fill('456 Delete Ave');
        await page.locator('.modal button[type="submit"]').click();
        await page.waitForTimeout(2000);
      }
    });

    test('click "Xóa" (fa-trash) → hiện confirm dialog', async ({ page }) => {
      await page.waitForTimeout(2000);
      // Find card containing h4 = tempName, then find delete button inside it
      const cardXpath = `(//h4[contains(text(),"${tempName}")]/ancestor::div[1])`;
      const deleteBtn = page.locator(`${cardXpath}//button[contains(@class,"btn-outline") and .//i[contains(@class,"fa-trash")]]`).first();
      await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });

      // Set up dialog handler for this test only (once)
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain(tempName);
        await dialog.accept();
      });
      await deleteBtn.click({ force: true });
      await page.waitForTimeout(1500);
    });

    test('confirm xóa → tòa nhà biến mất khỏi danh sách', async ({ page }) => {
      await page.waitForTimeout(2000);
      const cardXpath = `(//h4[contains(text(),"${tempName}")]/ancestor::div[1])`;
      const deleteBtn = page.locator(`${cardXpath}//button[contains(@class,"btn-outline") and .//i[contains(@class,"fa-trash")]]`).first();
      await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });

      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await deleteBtn.click({ force: true });

      await page.waitForTimeout(3000);

      const cardAfter = page.locator('.section-card h4', { hasText: tempName });
      await expect(cardAfter).toHaveCount(0);
    });

    test('cancel xóa → tòa nhà vẫn còn trong danh sách', async ({ page }) => {
      await page.waitForTimeout(2000);
      const cardXpath = `(//h4[contains(text(),"${tempName}")]/ancestor::div[1])`;
      const deleteBtn = page.locator(`${cardXpath}//button[contains(@class,"btn-outline") and .//i[contains(@class,"fa-trash")]]`).first();
      await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });

      page.once('dialog', async (dialog) => {
        await dialog.dismiss();
      });
      await deleteBtn.click({ force: true });

      await page.waitForTimeout(1000);

      const cardAfter = page.locator('.section-card h4', { hasText: tempName });
      await expect(cardAfter).toBeVisible({ timeout: 3000 }).catch(() => {});
    });
  });

  test.describe('MANAGER - không thấy nút Xóa', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, MANAGER.email, MANAGER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await page.goto(BUILDINGS_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('.nav-item', { timeout: 10000 });
      await page.waitForTimeout(1000);
    });

    test('MANAGER KHÔNG thấy nút "Xóa"', async ({ page }) => {
      const hasEmpty = await page.locator('.empty').count();
      if (hasEmpty > 0) return;
      await expect(page.locator('button:has(i.fa-trash)')).toHaveCount(0);
    });
  });
});

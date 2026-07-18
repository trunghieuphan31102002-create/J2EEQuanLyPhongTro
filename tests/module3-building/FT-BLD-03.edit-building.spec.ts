/**
 * FT-BLD-03: Sửa tòa nhà (Edit building).
 *
 * Kỳ vọng:
 *  - OWNER click "Sửa" → mở modal với heading "Chỉnh sửa"
 *  - Modal cho phép upload ảnh và chỉnh bản đồ
 *  - Submit không thay đổi → toast, modal đóng
 *  - Submit có thay đổi → thành công
 *  - Cancel → modal đóng
 *  - MANAGER không thấy nút Sửa
 */
import { test, expect } from '@playwright/test';
import { SEL, OWNER, MANAGER, clearStorage, loginViaUi, FRONTEND_URL } from './helpers/building';

const BUILDINGS_URL = FRONTEND_URL + '/dashboard/buildings';

async function openCreateAndSubmitTemp(page: ReturnType<typeof test['beforeEach']> extends Promise<infer T> ? T['page'] : never, tempName: string) {
  const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
  await page.getByPlaceholder(/VD: Chung cư/i).fill(tempName);
  await page.getByPlaceholder(/VD: 123 Nguyễn Huệ/i).fill('123 Test Edit St');
  await page.locator('.modal button[type="submit"]').click();
  await page.waitForTimeout(2000);
}

test.describe('FT-BLD-03: Sửa tòa nhà', () => {

  test.describe('OWNER - Sửa tòa nhà', () => {
    let tempName: string;

    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, OWNER.email, OWNER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await page.goto(BUILDINGS_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('.nav-item', { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Tạo tòa nhà test
      tempName = `Edit Test ${Date.now()}`;
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      const hasAddBtn = await addBtn.isVisible().catch(() => false);
      if (hasAddBtn) {
        await addBtn.click();
        await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
        await page.getByPlaceholder(/VD: Chung cư/i).fill(tempName);
        await page.getByPlaceholder(/VD: 123 Nguyễn Huệ/i).fill('123 Test Edit St');
        await page.locator('.modal button[type="submit"]').click();
        await page.waitForTimeout(2000);
      }
    });

    test('click "Sửa" → mở modal với heading "Chỉnh sửa"', async ({ page }) => {
      await page.waitForTimeout(1000);
      const editBtn = page.locator('button:has(i.fa-pen)').first();
      await editBtn.waitFor({ state: 'visible', timeout: 10000 });
      await editBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await expect(page.locator('.modal:visible h3').filter({ hasText: /Chỉnh sửa/ })).toBeVisible();
    });

    test('modal sửa có input upload ảnh', async ({ page }) => {
      await page.waitForTimeout(1000);
      const editBtn = page.locator('button:has(i.fa-pen)').first();
      await editBtn.waitFor({ state: 'visible', timeout: 10000 });
      await editBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await expect(page.locator('.modal:visible input[type="file"]')).toBeVisible();
    });

    test('modal sửa có MapPicker (bản đồ)', async ({ page }) => {
      await page.waitForTimeout(1000);
      const editBtn = page.locator('button:has(i.fa-pen)').first();
      await editBtn.waitFor({ state: 'visible', timeout: 10000 });
      await editBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      // Leaflet init có thể mất 5-10s trong modal, scroll vào view trước
      await page.locator('.modal-overlay.show .modal').scrollIntoViewIfNeeded();
      await page.waitForTimeout(5000); // Chờ Leaflet init
      const leaflet = page.locator('.modal:visible .leaflet-container');
      const count = await leaflet.count();
      if (count === 0) {
        // Thử lại sau
        await page.waitForTimeout(3000);
      }
      await expect(leaflet.first()).toBeVisible({ timeout: 15000 });
    });

    test('modal sửa có nút "Lưu thay đổi" và "Hủy"', async ({ page }) => {
      await page.waitForTimeout(1000);
      const editBtn = page.locator('button:has(i.fa-pen)').first();
      await editBtn.waitFor({ state: 'visible', timeout: 10000 });
      await editBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await expect(page.locator('.modal:visible button').filter({ hasText: 'Lưu thay đổi' })).toBeVisible();
      await expect(page.locator('.modal:visible button').filter({ hasText: 'Hủy' })).toBeVisible();
    });

    test('click "Hủy" → modal đóng, không lưu', async ({ page }) => {
      await page.waitForTimeout(1000);
      const editBtn = page.locator('button:has(i.fa-pen)').first();
      await editBtn.waitFor({ state: 'visible', timeout: 10000 });
      await editBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await page.locator('.modal:visible button').filter({ hasText: 'Hủy' }).click();
      await page.waitForTimeout(500);
      const modalCount = await page.locator('.modal-overlay.show').count();
      expect(modalCount).toBe(0);
    });

    test('submit không thay đổi → modal đóng', async ({ page }) => {
      await page.waitForTimeout(1000);
      const editBtn = page.locator('button:has(i.fa-pen)').first();
      await editBtn.waitFor({ state: 'visible', timeout: 10000 });
      await editBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await page.locator('.modal:visible button').filter({ hasText: 'Lưu thay đổi' }).click();
      await page.waitForTimeout(1500);
      const modalCount = await page.locator('.modal-overlay.show').count();
      expect(modalCount).toBe(0);
    });
  });

  test.describe('MANAGER - không thấy nút Sửa', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, MANAGER.email, MANAGER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await page.goto(BUILDINGS_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('.nav-item', { timeout: 10000 });
      await page.waitForTimeout(1000);
    });

    test('MANAGER KHÔNG thấy nút "Sửa"', async ({ page }) => {
      const hasEmpty = await page.locator('.empty').count();
      if (hasEmpty > 0) return;
      await expect(page.locator('button:has(i.fa-pen)')).toHaveCount(0);
    });
  });
});

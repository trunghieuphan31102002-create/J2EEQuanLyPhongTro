/**
 * FT-BLD-05: Upload ảnh tòa nhà (Upload image).
 *
 * Kỳ vọng:
 *  - Tạo tòa nhà → form có input[type=file] để upload ảnh
 *  - Chọn file ảnh → hiển thị preview
 *  - Submit với ảnh → thành công
 *  - Sửa tòa nhà → upload ảnh mới thay thế
 *  - MANAGER không thấy chức năng upload
 */
import { test, expect } from '@playwright/test';
import { clearStorage, loginViaUi, FRONTEND_URL } from './helpers/building';

const BUILDINGS_URL = FRONTEND_URL + '/dashboard/buildings';

// Base64 1x1 PNG
const BASE64_PNG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

test.describe('FT-BLD-05: Upload ảnh tòa nhà', () => {

  test.describe('OWNER - Upload ảnh khi tạo tòa nhà', () => {
    let tempName: string;

    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, 'owner@rentalms.com', 'owner123');
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await page.goto(BUILDINGS_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('.nav-item', { timeout: 10000 });
      await page.waitForTimeout(1000);
      tempName = `Upload Test ${Date.now()}`;
    });

    test('form tạo có input[type=file] để upload ảnh', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await expect(page.locator('.modal:visible input[type="file"]').first()).toBeVisible();
    });

    test('chọn file ảnh → hiển thị preview img', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });

      const fileInput = page.locator('.modal:visible input[type="file"]').first();
      const buffer = Buffer.from(BASE64_PNG, 'base64');
      await fileInput.setInputFiles({
        name: 'test-building.png',
        mimeType: 'image/png',
        buffer,
      });

      const preview = page.locator('.modal:visible img[alt="preview"]');
      await expect(preview).toBeVisible({ timeout: 3000 });
    });

    test('submit với ảnh → thành công, card mới xuất hiện', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });

      await page.getByPlaceholder(/VD: Chung cư/i).fill(tempName);
      await page.getByPlaceholder(/VD: 123 Nguyễn Huệ/i).fill('789 Upload Street');

      const fileInput = page.locator('.modal:visible input[type="file"]').first();
      const buffer = Buffer.from(BASE64_PNG, 'base64');
      await fileInput.setInputFiles({
        name: 'building-thumb.png',
        mimeType: 'image/png',
        buffer,
      });

      await page.locator('.modal button[type="submit"]').click();
      await page.waitForTimeout(3000);

      const modalCount = await page.locator('.modal-overlay.show').count();
      expect(modalCount).toBe(0);

      const card = page.locator('.section-card h4', { hasText: tempName });
      await expect(card).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('OWNER - Upload ảnh khi sửa tòa nhà', () => {
    let tempName: string;

    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, 'owner@rentalms.com', 'owner123');
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await page.goto(BUILDINGS_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('.nav-item', { timeout: 10000 });
      await page.waitForTimeout(1000);

      tempName = `Edit Image ${Date.now()}`;
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      const hasAdd = await addBtn.isVisible().catch(() => false);
      if (hasAdd) {
        await addBtn.click();
        await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
        await page.getByPlaceholder(/VD: Chung cư/i).fill(tempName);
        await page.getByPlaceholder(/VD: 123 Nguyễn Huệ/i).fill('111 Image St');
        await page.locator('.modal button[type="submit"]').click();
        await page.waitForTimeout(2000);
      }
    });

    test('modal sửa có input[type=file] để upload ảnh mới', async ({ page }) => {
      await page.waitForTimeout(1000);
      const editBtn = page.locator('button:has(i.fa-pen)').first();
      await editBtn.waitFor({ state: 'visible', timeout: 10000 });
      await editBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await expect(page.locator('.modal:visible input[type="file"]').first()).toBeVisible();
    });

    test('upload ảnh mới + save → thành công, modal đóng', async ({ page }) => {
      await page.waitForTimeout(1000);
      const editBtn = page.locator('button:has(i.fa-pen)').first();
      await editBtn.waitFor({ state: 'visible', timeout: 10000 });
      await editBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });

      const fileInput = page.locator('.modal:visible input[type="file"]').first();
      const buffer = Buffer.from(BASE64_PNG, 'base64');
      await fileInput.setInputFiles({
        name: 'new-image.png',
        mimeType: 'image/png',
        buffer,
      });

      await expect(page.locator('.modal:visible img[alt="preview"]')).toBeVisible({ timeout: 3000 });

      await page.locator('.modal:visible button').filter({ hasText: 'Lưu thay đổi' }).click();
      await page.waitForTimeout(2000);

      const modalCount = await page.locator('.modal-overlay.show').count();
      expect(modalCount).toBe(0);
    });
  });

  test.describe('MANAGER - không thấy chức năng upload', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, 'manager@rentalms.com', 'manager123');
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await page.goto(BUILDINGS_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('.nav-item', { timeout: 10000 });
      await page.waitForTimeout(1000);
    });

    test('MANAGER KHÔNG thấy nút "Thêm tòa nhà"', async ({ page }) => {
      await expect(page.locator('.section-head button').filter({ hasText: /Thêm tòa nhà|Thêm ngay/ })).toHaveCount(0);
    });
  });
});

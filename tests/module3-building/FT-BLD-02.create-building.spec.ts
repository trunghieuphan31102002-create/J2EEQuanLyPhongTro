/**
 * FT-BLD-02: Tạo tòa nhà (Add building).
 *
 * Kỳ vọng:
 *  - OWNER mở modal "Thêm tòa nhà"
 *  - Form có: Tên, Địa chỉ, Mô tả, Trạng thái, Ảnh, Bản đồ
 *  - Validate: Tên + Địa chỉ bắt buộc
 *  - Submit đầy đủ → tạo thành công, card mới xuất hiện
 *  - Cancel → modal đóng
 *  - MANAGER không thấy nút tạo
 */
import { test, expect } from '@playwright/test';
import { SEL, OWNER, MANAGER, clearStorage, loginViaUi, FRONTEND_URL } from './helpers/building';

const BUILDINGS_URL = FRONTEND_URL + '/dashboard/buildings';
const BUILDING_NAME = `Test Building ${Date.now()}`;
const BUILDING_ADDRESS = '123 Test Street, District 1, Ho Chi Minh';

test.describe('FT-BLD-02: Tạo tòa nhà', () => {

  test.describe('OWNER - Tạo tòa nhà thành công', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, OWNER.email, OWNER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await page.goto(BUILDINGS_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('.nav-item', { timeout: 10000 });
      await page.waitForTimeout(1000);
    });

    test('modal "Thêm tòa nhà" mở với heading "Thêm tòa nhà"', async ({ page }) => {
      // Click nút Thêm tòa nhà
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await expect(page.getByRole('heading', { name: /Thêm tòa nhà/i })).toBeVisible();
    });

    test('form có input Tên tòa nhà', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await expect(page.getByPlaceholder(/VD: Chung cư/i)).toBeVisible();
    });

    test('form có input Địa chỉ', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await expect(page.getByPlaceholder(/VD: 123 Nguyễn Huệ/i)).toBeVisible();
    });

    test('form có textarea Mô tả', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await expect(page.locator('textarea').first()).toBeVisible();
    });

    test('form có select Trạng thái hiển thị', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      const select = page.locator('.modal select').first();
      await expect(select).toBeVisible();
      await expect(select).toContainText('Riêng tư');
      await expect(select).toContainText('Công khai');
    });

    test('form có input upload ảnh (type=file)', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await expect(page.locator('.modal:visible input[type="file"]').first()).toBeVisible();
    });

    test('form có MapPicker (bản đồ leaflet)', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await expect(page.locator('.leaflet-container').first()).toBeVisible();
    });

    test('submit thiếu name + address → modal không đóng', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await page.locator('.modal button[type="submit"]').click();
      await page.waitForTimeout(500);
      await expect(page.locator('.modal-overlay.show')).toBeVisible();
    });

    test('submit đầy đủ name + address → thành công, card mới xuất hiện', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      await page.getByPlaceholder(/VD: Chung cư/i).fill(BUILDING_NAME);
      await page.getByPlaceholder(/VD: 123 Nguyễn Huệ/i).fill(BUILDING_ADDRESS);
      await page.locator('.modal button[type="submit"]').click();
      await page.waitForTimeout(3000);
      // Modal đã đóng
      const modalCount = await page.locator('.modal-overlay.show').count();
      expect(modalCount).toBe(0);
      // Card mới xuất hiện
      const newCard = page.locator('.section-card h4', { hasText: BUILDING_NAME });
      await expect(newCard).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('OWNER - Hủy modal', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, OWNER.email, OWNER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await page.goto(BUILDINGS_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('.nav-item', { timeout: 10000 });
      await page.waitForTimeout(1000);
    });

    test('click "Hủy" → modal đóng', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      // Nút "Hủy" nằm trong modal-footer
      const cancelBtn = page.locator('.modal-overlay.show .modal-footer button').filter({ hasText: 'Hủy' });
      await cancelBtn.waitFor({ state: 'visible', timeout: 5000 });
      await cancelBtn.click();
      await page.waitForTimeout(500);
      const modalCount = await page.locator('.modal-overlay.show').count();
      expect(modalCount).toBe(0);
    });

    test('click overlay ngoài modal → modal đóng', async ({ page }) => {
      const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
      // Click vào góc trái trên của overlay (ngoài modal)
      await page.locator('.modal-overlay.show').click({ position: { x: 5, y: 5 } });
      await page.waitForTimeout(500);
      const modalCount = await page.locator('.modal-overlay.show').count();
      expect(modalCount).toBe(0);
    });
  });

  test.describe('MANAGER - không thấy nút tạo', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, MANAGER.email, MANAGER.password);
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

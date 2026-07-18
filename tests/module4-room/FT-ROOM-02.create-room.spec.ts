/**
 * FT-ROOM-02: Tạo phòng (Add room).
 *
 * Kỳ vọng:
 *  - OWNER phải có ít nhất 1 building trước (helper tự tạo nếu chưa có)
 *  - Mở modal "Thêm phòng" từ nút "Thêm phòng" ở header
 *  - Form có: select Tòa nhà, input Số phòng, input Giá, input Diện tích,
 *    input Số giường, input Tiện nghi, textarea Mô tả, input upload ảnh
 *  - Validate: Số phòng + Giá bắt buộc (client-side)
 *  - Submit đầy đủ → tạo thành công, room-card mới xuất hiện
 *  - Cancel (nút Hủy / overlay) → modal đóng
 */
import { test, expect } from '@playwright/test';
import { SEL, OWNER, MANAGER, clearStorage, loginViaUi } from './helpers/auth';
import { gotoRoomsPage, gotoBuildingsPage, ROUTES, FRONTEND_URL, SEL as ROOM_SEL } from './helpers/room';

const S = { ...SEL, ...ROOM_SEL };
const ROOMS_URL = FRONTEND_URL + ROUTES.rooms;
const ROOM_NO_PREFIX = `R${Date.now()}`;

// Scope vào modal ĐANG HIỂN THỊ (chỉ có 1 modal overlay.show tại 1 thời điểm)
const VISIBLE_MODAL = '.modal-overlay.show .modal';

test.describe('FT-ROOM-02: Tạo phòng', () => {

  test.describe('OWNER - Tạo phòng thành công', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, OWNER.email, OWNER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      // Đảm bảo có ít nhất 1 building
      await gotoBuildingsPage(page);
      const hasBuildings = await page.locator('.section-card h4').count();
      if (hasBuildings === 0) {
        const buildingName = `B_${Date.now()}`;
        const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
        await addBtn.click();
        await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
        await page.getByPlaceholder(/VD: Chung cư/i).fill(buildingName);
        await page.getByPlaceholder(/VD: 123 Nguyễn Huệ/i).fill('123 Test Street');
        await page.locator('.modal-overlay.show .modal button[type="submit"]').click();
        await page.waitForTimeout(3000);
      }
      await gotoRoomsPage(page);
    });

    test('modal "Thêm phòng" mở với heading "Thêm phòng"', async ({ page }) => {
      const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      await expect(page.locator(`${VISIBLE_MODAL} h3`).filter({ hasText: /Thêm phòng/ })).toBeVisible();
    });

    test('form có select Tòa nhà', async ({ page }) => {
      const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
      await addBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      await expect(page.locator(`${VISIBLE_MODAL} select`).first()).toBeVisible();
    });

    test('form có input Số phòng (placeholder "VD: A101")', async ({ page }) => {
      const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
      await addBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      await expect(page.locator(`${VISIBLE_MODAL} input[placeholder="VD: A101"]`)).toBeVisible();
    });

    test('form có 3 input number (Giá, Diện tích, Số giường)', async ({ page }) => {
      const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
      await addBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      const numberInputs = page.locator(`${VISIBLE_MODAL} input[type="number"]`);
      expect(await numberInputs.count()).toBeGreaterThanOrEqual(3);
    });

    test('form có input Tiện nghi (placeholder "Máy lạnh...")', async ({ page }) => {
      const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
      await addBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      await expect(page.locator(`${VISIBLE_MODAL} input[placeholder*="Máy lạnh"]`)).toBeVisible();
    });

    test('form có textarea Mô tả', async ({ page }) => {
      const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
      await addBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      await expect(page.locator(`${VISIBLE_MODAL} textarea`)).toBeVisible();
    });

    test('form có input upload ảnh (type=file)', async ({ page }) => {
      const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
      await addBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      await expect(page.locator(`${VISIBLE_MODAL} input[type="file"]`).first()).toBeVisible();
    });

    test('submit thiếu Số phòng + Giá → modal không đóng (validation)', async ({ page }) => {
      const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
      await addBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      // Bỏ trống, submit thẳng
      await page.locator(`${VISIBLE_MODAL} button[type="submit"]`).click();
      await page.waitForTimeout(800);
      // Modal vẫn mở
      await expect(page.locator(S.modalOverlay)).toBeVisible();
    });

    test('submit đầy đủ Số phòng + Giá → thành công, room-card mới xuất hiện', async ({ page }) => {
      const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
      await addBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      const roomNo = `${ROOM_NO_PREFIX}A`;
      await page.locator(`${VISIBLE_MODAL} input[placeholder="VD: A101"]`).fill(roomNo);
      // Input Giá là input number đầu tiên
      await page.locator(`${VISIBLE_MODAL} input[type="number"]`).first().fill('3000000');
      // Điền thêm diện tích + số giường + tiện nghi + mô tả (optional)
      await page.locator(`${VISIBLE_MODAL} input[type="number"]`).nth(1).fill('25');
      await page.locator(`${VISIBLE_MODAL} input[type="number"]`).nth(2).fill('2');
      await page.locator(`${VISIBLE_MODAL} input[placeholder*="Máy lạnh"]`).fill('Wifi, Máy lạnh');
      await page.locator(`${VISIBLE_MODAL} textarea`).fill('Phòng test tự động');
      await page.locator(`${VISIBLE_MODAL} button[type="submit"]`).click();
      // Chờ modal đóng
      await page.waitForSelector(S.modalOverlay, { state: 'hidden', timeout: 10000 });
      // Room-card mới xuất hiện
      const newCard = page.locator(S.roomCard).filter({ hasText: `Phòng ${roomNo}` });
      await expect(newCard).toBeVisible({ timeout: 8000 });
    });
  });

  test.describe('OWNER - Hủy modal', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, OWNER.email, OWNER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await gotoRoomsPage(page);
    });

    test('click "Hủy" trong modal tạo phòng → modal đóng', async ({ page }) => {
      const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 10000 });
      await addBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      await page.locator(`${VISIBLE_MODAL} button:has-text("Hủy")`).click();
      await page.waitForTimeout(500);
      expect(await page.locator(S.modalOverlay).count()).toBe(0);
    });

    test('click overlay ngoài modal tạo phòng → modal đóng', async ({ page }) => {
      const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
      await addBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      await page.locator(S.modalOverlay).click({ position: { x: 5, y: 5 } });
      await page.waitForTimeout(500);
      expect(await page.locator(S.modalOverlay).count()).toBe(0);
    });
  });

  test.describe('MANAGER - không thấy nút tạo', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, MANAGER.email, MANAGER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await gotoRoomsPage(page);
    });

    test('MANAGER KHÔNG thấy nút "Thêm phòng"', async ({ page }) => {
      await expect(page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ })).toHaveCount(0);
    });
  });
});

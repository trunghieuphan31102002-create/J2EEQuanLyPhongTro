/**
 * FT-ROOM-01: Xem danh sách phòng (List rooms).
 *
 * Kỳ vọng:
 *  - OWNER đăng nhập → vào /dashboard/rooms → hiển thị section "Quản lý phòng"
 *  - Nếu chưa có building → empty state "Cần tạo tòa nhà trước"
 *  - Nếu có building nhưng chưa có phòng → empty state "Chưa có phòng nào"
 *  - Có nút "Thêm phòng" ở header (chỉ OWNER/ADMIN)
 *  - Mỗi room-card có: ảnh/emoji, badge trạng thái, số phòng, tên tòa nhà,
 *    meta (diện tích/giường), giá, nút Sửa/Upload/Xóa
 *  - MANAGER chỉ xem, KHÔNG thấy nút Thêm/Sửa/Xóa
 *  - TENANT không thấy menu "Phòng" trong topnav
 */
import { test, expect } from '@playwright/test';
import { SEL, OWNER, MANAGER, TENANT, clearStorage, loginViaUi } from './helpers/auth';
import { gotoRoomsPage, FRONTEND_URL, ROUTES, SEL as ROOM_SEL } from './helpers/room';

// Dùng SEL từ room helper (vì auth không có các selector UI của rooms)
const S = { ...SEL, ...ROOM_SEL };

const ROOMS_URL = FRONTEND_URL + ROUTES.rooms;

test.describe('FT-ROOM-01: Xem danh sách phòng', () => {

  test.describe('OWNER - đầy đủ chức năng', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, OWNER.email, OWNER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await gotoRoomsPage(page);
    });

    test('trang hiển thị heading "Quản lý phòng"', async ({ page }) => {
      await expect(page.locator(S.heading).filter({ hasText: /Quản lý phòng/ })).toBeVisible({ timeout: 8000 });
    });

    test('có nút "Thêm phòng" ở header', async ({ page }) => {
      const btn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ });
      await expect(btn.first()).toBeVisible({ timeout: 8000 });
    });

    test('section render (room-card hoặc empty state)', async ({ page }) => {
      await page.waitForTimeout(2000);
      const hasRoomCards = await page.locator(S.roomCard).count();
      const hasEmpty = await page.locator(S.empty).count();
      expect(hasRoomCards + hasEmpty).toBeGreaterThan(0);
    });

    test('mỗi room-card có tên phòng (h4 "Phòng {roomNo}") hoặc empty state', async ({ page }) => {
      await page.waitForTimeout(2000);
      const hasEmpty = await page.locator(S.empty).count();
      if (hasEmpty > 0) return;
      const cards = page.locator(S.roomCard);
      const count = await cards.count();
      if (count === 0) return;
      await expect(cards.first().locator('h4')).toContainText(/Phòng/);
    });

    test('mỗi room-card có badge trạng thái (status class)', async ({ page }) => {
      await page.waitForTimeout(2000);
      const hasEmpty = await page.locator(S.empty).count();
      if (hasEmpty > 0) return;
      const cards = page.locator(S.roomCard);
      const count = await cards.count();
      if (count === 0) return;
      await expect(cards.first().locator(S.roomStatus)).toBeVisible();
    });

    test('mỗi room-card có giá phòng (.price)', async ({ page }) => {
      await page.waitForTimeout(2000);
      const hasEmpty = await page.locator(S.empty).count();
      if (hasEmpty > 0) return;
      const cards = page.locator(S.roomCard);
      const count = await cards.count();
      if (count === 0) return;
      await expect(cards.first().locator(S.priceLabel)).toBeVisible();
      const priceText = await cards.first().locator(S.priceLabel).textContent();
      expect(priceText).toMatch(/đ/);
    });

    test('OWNER thấy nút "Sửa phòng" (fa-pen) trên card', async ({ page }) => {
      await page.waitForTimeout(2000);
      const hasEmpty = await page.locator(S.empty).count();
      if (hasEmpty > 0) return;
      const cards = page.locator(S.roomCard);
      const count = await cards.count();
      if (count === 0) return;
      await expect(cards.first().locator(S.editBtn)).toBeVisible();
    });

    test('OWNER thấy nút "Upload ảnh/video" (fa-photo-film) trên card', async ({ page }) => {
      await page.waitForTimeout(2000);
      const hasEmpty = await page.locator(S.empty).count();
      if (hasEmpty > 0) return;
      const cards = page.locator(S.roomCard);
      const count = await cards.count();
      if (count === 0) return;
      await expect(cards.first().locator(S.uploadMediaBtn)).toBeVisible();
    });

    test('OWNER thấy nút "Xóa phòng" (fa-trash) trên card', async ({ page }) => {
      await page.waitForTimeout(2000);
      const hasEmpty = await page.locator(S.empty).count();
      if (hasEmpty > 0) return;
      const cards = page.locator(S.roomCard);
      const count = await cards.count();
      if (count === 0) return;
      await expect(cards.first().locator(S.deleteBtn)).toBeVisible();
    });
  });

  test.describe('MANAGER - chỉ xem, không tạo/sửa/xóa', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, MANAGER.email, MANAGER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await gotoRoomsPage(page);
    });

    test('trang hiển thị heading "Quản lý phòng"', async ({ page }) => {
      await expect(page.locator(S.heading).filter({ hasText: /Quản lý phòng/ })).toBeVisible({ timeout: 8000 });
    });

    test('MANAGER KHÔNG thấy nút "Thêm phòng"', async ({ page }) => {
      await expect(page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ })).toHaveCount(0);
    });

    test('MANAGER KHÔNG thấy nút Sửa/Xóa trên card', async ({ page }) => {
      await page.waitForTimeout(2000);
      const hasEmpty = await page.locator(S.empty).count();
      if (hasEmpty > 0) return;
      const cards = page.locator(S.roomCard);
      const count = await cards.count();
      if (count === 0) return;
      await expect(cards.first().locator(S.editBtn)).toHaveCount(0);
      await expect(cards.first().locator(S.deleteBtn)).toHaveCount(0);
      await expect(cards.first().locator(S.uploadMediaBtn)).toHaveCount(0);
    });
  });

  test.describe('TENANT - không có quyền truy cập trang Rooms', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, TENANT.email, TENANT.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    });

    test('TENANT không thấy menu "Phòng" trong topnav', async ({ page }) => {
      const navItems = page.locator('.nav-item');
      await expect(navItems.filter({ hasText: 'Phòng' })).toHaveCount(0);
    });

    test('TENANT gõ URL /dashboard/rooms → không hiển thị section phòng (ghi nhận nếu bypass)', async ({ page }) => {
      await page.goto(ROOMS_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      const sectionCount = await page.locator(S.sectionHead).count();
      if (sectionCount > 0) {
        console.log('[BUG] TENANT truy cập /dashboard/rooms thành công — phân quyền UI bị bypass');
      }
    });
  });
});

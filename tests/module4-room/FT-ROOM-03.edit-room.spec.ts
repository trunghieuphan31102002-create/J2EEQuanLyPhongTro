/**
 * FT-ROOM-03: Sửa phòng (Edit room).
 *
 * Kỳ vọng:
 *  - OWNER click nút "Sửa phòng" (fa-pen) trên card → mở modal "Sửa phòng {roomNo}"
 *  - Form có đầy đủ các trường (giống form tạo) + preview ảnh hiện tại
 *  - Sửa giá → submit → modal đóng, giá mới hiển thị trên card
 *  - Click "Hủy" → modal đóng, KHÔNG lưu
 *  - Submit không thay đổi → modal đóng, dữ liệu giữ nguyên
 *  - MANAGER KHÔNG thấy nút Sửa
 */
import { test, expect } from '@playwright/test';
import { SEL, OWNER, MANAGER, clearStorage, loginViaUi } from './helpers/auth';
import { gotoRoomsPage, gotoBuildingsPage, SEL as ROOM_SEL } from './helpers/room';

const S = { ...SEL, ...ROOM_SEL };
const VISIBLE_MODAL = '.modal-overlay.show .modal';

test.describe('FT-ROOM-03: Sửa phòng', () => {

  test.describe('OWNER - Sửa phòng thành công', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, OWNER.email, OWNER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      // Đảm bảo có building
      await gotoBuildingsPage(page);
      const hasBuildings = await page.locator('.section-card h4').count();
      if (hasBuildings === 0) {
        const buildingName = `B_${Date.now()}`;
        const addBtn = page.locator('.section-head button').filter({ hasText: /Thêm/ }).first();
        await addBtn.click();
        await page.waitForSelector('.modal-overlay.show', { timeout: 5000 });
        await page.getByPlaceholder(/VD: Chung cư/i).fill(buildingName);
        await page.getByPlaceholder(/VD: 123 Nguyễn Huệ/i).fill('123 Test Street');
        await page.locator(`${VISIBLE_MODAL} button[type="submit"]`).click();
        await page.waitForTimeout(3000);
      }
      await gotoRoomsPage(page);
      // Tạo 1 phòng test trước (nếu chưa có)
      await page.waitForTimeout(2000);
      const hasRoom = await page.locator(S.roomCard).count();
      if (hasRoom === 0) {
        const addBtn = page.locator(S.sectionHead).locator('button').filter({ hasText: /Thêm phòng/ }).first();
        await addBtn.click();
        await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
        await page.locator(`${VISIBLE_MODAL} input[placeholder="VD: A101"]`).fill(`EDIT_${Date.now()}`);
        await page.locator(`${VISIBLE_MODAL} input[type="number"]`).first().fill('2000000');
        await page.locator(`${VISIBLE_MODAL} button[type="submit"]`).click();
        await page.waitForTimeout(3000);
      }
    });

    test('click "Sửa phòng" → mở modal với heading "Sửa phòng {roomNo}"', async ({ page }) => {
      const firstEditBtn = page.locator(S.roomCard).first().locator(S.editBtn);
      await firstEditBtn.waitFor({ state: 'visible', timeout: 8000 });
      await firstEditBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      const heading = page.locator(`${VISIBLE_MODAL} h3`).filter({ hasText: /Sửa phòng/ });
      await expect(heading).toBeVisible();
      const text = await heading.textContent();
      expect(text).toMatch(/Sửa phòng\s+\S+/);
    });

    test('modal sửa có input Số phòng (pre-filled)', async ({ page }) => {
      const firstEditBtn = page.locator(S.roomCard).first().locator(S.editBtn);
      await firstEditBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      // Modal sửa KHÔNG có placeholder, dùng label "Số phòng *"
      const roomNoInput = page.locator(`${VISIBLE_MODAL} label:has-text("Số phòng") + input,
                                          ${VISIBLE_MODAL} .form-group:has(label:has-text("Số phòng")) input`).first();
      await expect(roomNoInput).toBeVisible();
      const value = await roomNoInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    });

    test('modal sửa có input upload ảnh (type=file)', async ({ page }) => {
      const firstEditBtn = page.locator(S.roomCard).first().locator(S.editBtn);
      await firstEditBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      await expect(page.locator(`${VISIBLE_MODAL} input[type="file"]`).first()).toBeVisible();
    });

    test('modal sửa có nút "Lưu thay đổi" và "Hủy"', async ({ page }) => {
      const firstEditBtn = page.locator(S.roomCard).first().locator(S.editBtn);
      await firstEditBtn.click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      await expect(page.locator(`${VISIBLE_MODAL} button[type="submit"]`).filter({ hasText: /Lưu/ })).toBeVisible();
      await expect(page.locator(`${VISIBLE_MODAL} button:has-text("Hủy")`)).toBeVisible();
    });

    test('sửa giá phòng → submit → modal đóng, giá mới hiển thị trên card', async ({ page }) => {
      const firstCard = page.locator(S.roomCard).first();
      await firstCard.locator(S.editBtn).click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      const priceInput = page.locator(`${VISIBLE_MODAL} input[type="number"]`).first();
      await priceInput.fill('5500000');
      await page.locator(`${VISIBLE_MODAL} button[type="submit"]`).click();
      await page.waitForSelector(S.modalOverlay, { state: 'hidden', timeout: 10000 });
      // Refresh để chắc chắn data đã update
      await page.reload();
      await page.waitForTimeout(2000);
      const updatedCard = page.locator(S.roomCard).first();
      await expect(updatedCard).toContainText(/5[.,]500[.,]000/);
    });

    test('click "Hủy" trong modal sửa → modal đóng, KHÔNG lưu thay đổi', async ({ page }) => {
      const firstCard = page.locator(S.roomCard).first();
      const oldPrice = await firstCard.locator(S.priceLabel).textContent();
      await firstCard.locator(S.editBtn).click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      const priceInput = page.locator(`${VISIBLE_MODAL} input[type="number"]`).first();
      await priceInput.fill('9999999');
      await page.locator(`${VISIBLE_MODAL} button:has-text("Hủy")`).click();
      await page.waitForTimeout(500);
      expect(await page.locator(S.modalOverlay).count()).toBe(0);
      const newPrice = await page.locator(S.roomCard).first().locator(S.priceLabel).textContent();
      expect(newPrice).toBe(oldPrice);
    });

    test('submit không thay đổi → modal đóng', async ({ page }) => {
      const firstCard = page.locator(S.roomCard).first();
      await firstCard.locator(S.editBtn).click();
      await page.waitForSelector(S.modalOverlay, { timeout: 5000 });
      await page.locator(`${VISIBLE_MODAL} button[type="submit"]`).click();
      await page.waitForSelector(S.modalOverlay, { state: 'hidden', timeout: 10000 });
    });
  });

  test.describe('MANAGER - không thấy nút Sửa', () => {
    test.beforeEach(async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, MANAGER.email, MANAGER.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });
      await gotoRoomsPage(page);
    });

    test('MANAGER KHÔNG thấy nút "Sửa phòng" trên card', async ({ page }) => {
      await page.waitForTimeout(2000);
      const hasEmpty = await page.locator(S.empty).count();
      if (hasEmpty > 0) return;
      const cards = page.locator(S.roomCard);
      const count = await cards.count();
      if (count === 0) return;
      await expect(cards.first().locator(S.editBtn)).toHaveCount(0);
    });
  });
});

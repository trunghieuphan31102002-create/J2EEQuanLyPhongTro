/**
 * Helper cho Module 4 - Quản lý Phòng (Room).
 * Selectors + utility functions cho RoomsSection.tsx.
 */
import type { Page } from '@playwright/test';
import { FRONTEND_URL, ROUTES } from './auth';

// Selectors dựa trên RoomsSection.tsx
export const SEL = {
  // Section header
  sectionHead: '.section-head',
  heading: '.section-head h3',
  addRoomBtn: 'button:has-text("Thêm phòng")',

  // Empty states
  emptyNoBuilding: '.empty:has-text("Cần tạo tòa nhà trước")',
  emptyNoRoom: '.empty:has-text("Chưa có phòng nào")',
  empty: '.empty',

  // Loading
  loading: '.loading',

  // Room card
  roomCard: '.room-card',
  roomCardImg: '.room-card-img',
  roomStatus: '.room-status',
  roomCardBody: '.room-card-body',
  roomMeta: '.room-meta',
  priceLabel: '.price',

  // Buttons trên card (chỉ OWNER/ADMIN thấy)
  editBtn: 'button[title="Sửa phòng"]',
  uploadMediaBtn: 'button[title="Upload ảnh/video"]',
  deleteBtn: 'button[title="Xóa phòng"]',

  // Modal chung
  modalOverlay: '.modal-overlay.show',
  modalClose: '.modal-close',
  // Modal đang hiển thị (chỉ có 1 .show tại 1 thời điểm)
  visibleModal: '.modal-overlay.show .modal',

  // Modal tạo phòng
  createRoomModal: '.modal:has(h3:has-text("Thêm phòng"))',
  buildingSelect: '.modal select',
  roomNoInput: '.modal input[placeholder="VD: A101"]',
  priceInput: '.modal input[type="number"]:nth-of-type(1)', // first number input = price
  areaInput: '.modal input[type="number"]:nth-of-type(2)',
  bedsInput: '.modal input[type="number"]:nth-of-type(3)',
  amenitiesInput: '.modal input[placeholder*="Máy lạnh"]',
  descriptionTextarea: '.modal textarea',
  fileInput: '.modal input[type="file"]',
  submitBtn: '.modal button[type="submit"]',
  cancelBtn: '.modal-footer button:has-text("Hủy")',

  // Modal sửa phòng - heading có dạng "Sửa phòng {roomNo}"
  editRoomModal: '.modal:has(h3:has-text("Sửa phòng"))',

  // Toast
  toast: '.toast, [class*="toast"]',
};

// Đợi trang dashboard/rooms load xong (TopNav dùng .nav-item, không phải sidebar)
export async function gotoRoomsPage(page: Page) {
  await page.goto(FRONTEND_URL + ROUTES.rooms);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('.nav-item', { timeout: 10000 });
  await page.waitForTimeout(1500);
}

export async function gotoBuildingsPage(page: Page) {
  await page.goto(FRONTEND_URL + ROUTES.buildings);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('.nav-item', { timeout: 10000 });
  await page.waitForTimeout(1500);
}

export { FRONTEND_URL, ROUTES };

export async function closeModal(page: Page) {
  const closeBtn = page.locator(SEL.modalClose);
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(400);
  }
}

/**
 * Tạo 1 tòa nhà test qua UI (OWNER).
 * Trả về tên tòa nhà để dùng cho các test phụ thuộc.
 */
export async function ensureBuildingExists(page: Page): Promise<string> {
  const buildingName = `Building_Test_${Date.now()}`;
  await gotoBuildingsPage(page);

  // Nếu đã có building nào đó thì không cần tạo mới
  const cards = await page.locator('.section-card h4').count();
  if (cards > 0) {
    return (await page.locator('.section-card h4').first().textContent()) || buildingName;
  }

  // Click "Thêm tòa nhà"
  const addBtn = page.locator(SEL.sectionHead).locator('button').filter({ hasText: /Thêm/ }).first();
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector(SEL.modalOverlay, { timeout: 5000 });

  await page.getByPlaceholder(/VD: Chung cư/i).fill(buildingName);
  await page.getByPlaceholder(/VD: 123 Nguyễn Huệ/i).fill('123 Test Street');
  await page.locator(SEL.submitBtn).click();
  await page.waitForTimeout(3000);
  return buildingName;
}

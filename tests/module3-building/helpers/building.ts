/**
 * Helper dùng chung cho Module 3 - Quản lý Tòa nhà (Building).
 */
import { clearStorage, loginViaUi, ROUTES as AUTH_ROUTES } from './auth';
import type { Page } from '@playwright/test';

export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const ROUTES = {
  ...AUTH_ROUTES,
  buildings: '/dashboard/buildings',
  rooms: '/dashboard/rooms',
};

export const SEL = {
  heading: '.section-head h3',
  addBuildingBtn: 'button:has-text("Thêm tòa nhà")',
  addBuildingBtnAlt: 'button:has-text("Thêm ngay")',
  badgePublic: '.badge-green',
  badgePrivate: '.badge-gray',
  emptyState: '.empty',
  modalOverlay: '.modal-overlay.show',
};

export const OWNER = { email: 'owner@rentalms.com', password: 'owner123' };
export const MANAGER = { email: 'manager@rentalms.com', password: 'manager123' };
export const ADMIN = { email: 'admin@rentalms.com', password: 'admin123' };
export const TENANT = { email: 'tenant1@rentalms.com', password: 'tenant123' };

export async function loginAsOwner(page: Page) {
  await loginViaUi(page, OWNER.email, OWNER.password);
  await page.waitForURL(/\/dashboard/, { timeout: 5000 });
}

export async function loginAsManager(page: Page) {
  await loginViaUi(page, MANAGER.email, MANAGER.password);
  await page.waitForURL(/\/dashboard/, { timeout: 5000 });
}

export async function gotoBuildings(page: Page) {
  await page.goto(FRONTEND_URL + ROUTES.buildings);
  await page.waitForLoadState('networkidle');
}

export async function closeModal(page: Page) {
  const closeBtn = page.locator('.modal-close');
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(400);
  }
}

export { clearStorage, loginViaUi };

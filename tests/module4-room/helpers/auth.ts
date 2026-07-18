/**
 * Helper dùng chung cho Module 4 - Quản lý Phòng (Room).
 * Auth + Room selectors + login helpers.
 */
import type { Page } from '@playwright/test';

export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export const SEL = {
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitBtn: 'button[type="submit"]',
};

export const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  rooms: '/dashboard/rooms',
  buildings: '/dashboard/buildings',
};

export const OWNER = { email: 'owner@rentalms.com', password: 'owner123' };
export const MANAGER = { email: 'manager@rentalms.com', password: 'manager123' };
export const ADMIN = { email: 'admin@rentalms.com', password: 'admin123' };
export const TENANT = { email: 'tenant1@rentalms.com', password: 'tenant123' };

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto(FRONTEND_URL + ROUTES.login);
  await page.fill(SEL.emailInput, email);
  await page.fill(SEL.passwordInput, password);
  await page.click(SEL.submitBtn);
}

export async function clearStorage(page: Page) {
  await page.goto(FRONTEND_URL);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

export async function loginAsOwner(page: Page) {
  await loginViaUi(page, OWNER.email, OWNER.password);
  await page.waitForURL(/\/dashboard/, { timeout: 8000 });
}

export async function loginAsManager(page: Page) {
  await loginViaUi(page, MANAGER.email, MANAGER.password);
  await page.waitForURL(/\/dashboard/, { timeout: 8000 });
}

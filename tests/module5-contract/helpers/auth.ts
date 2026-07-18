/**
 * Helper dùng chung cho Module 5 - Quản lý Hợp đồng (Contract).
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
  contracts: '/dashboard/contracts',
};

export const OWNER = { email: 'owner@rentalms.com', password: 'owner123' };
export const MANAGER = { email: 'manager@rentalms.com', password: 'manager123' };
export const ADMIN = { email: 'admin@rentalms.com', password: 'admin123' };
export const TENANT = { email: 'tenant1@rentalms.com', password: 'tenant123' };
export const TENANT2 = { email: 'tenant2@rentalms.com', password: 'tenant123' };

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

/**
 * Login và lấy token + user từ localStorage.
 * Dùng để gọi API backend trực tiếp (vì UI dashboard không có flow tạo contract).
 */
export async function loginAndGetToken(page: Page, email: string, password: string) {
  await loginViaUi(page, email, password);
  await page.waitForURL(/\/dashboard/, { timeout: 8000 });
  await page.waitForTimeout(500);
  return await page.evaluate(() => ({
    token: localStorage.getItem('token'),
    userRaw: localStorage.getItem('user'),
  }));
}

/**
 * Helper dùng chung cho Module 3 - Building.
 * Auth selectors + login helpers.
 */
import type { Page } from '@playwright/test';

export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export const VALID_USER = {
  email: 'tenant1@rentalms.com',
  password: 'tenant123',
};

export const SEL = {
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitBtn: 'button[type="submit"]',
  errorAlert: '.bg-red-100',
  successAlert: '.bg-emerald-100',
  demoAdminBtn: 'button:has-text("Admin")',
  demoOwnerBtn: 'button:has-text("Chủ nhà")',
  demoTenantBtn: 'button:has-text("Người thuê")',
  navLogoutBtn: 'button:has(i.fa-right-from-bracket)',
  navLoginLink: 'a:has-text("Đăng nhập")',
};

export const ROUTES = {
  login: '/login',
  home: '/home',
  dashboard: '/dashboard',
  protected: '/rentalms',
  notifications: '/notifications',
};

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto(ROUTES.login);
  await page.fill(SEL.emailInput, email);
  await page.fill(SEL.passwordInput, password);
  await page.click(SEL.submitBtn);
}

export async function getStoredAuth(page: Page) {
  return await page.evaluate(() => ({
    token: localStorage.getItem('token'),
    user: localStorage.getItem('user'),
  }));
}

export async function clearStorage(page: Page) {
  await page.goto(FRONTEND_URL);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

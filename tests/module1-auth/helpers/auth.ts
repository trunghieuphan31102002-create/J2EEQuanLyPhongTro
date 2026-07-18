/**
 * Helper dung chung cho Module 1 - Authentication.
 * Selector duoc loc theo DOM that cua LoginPage / Navbar (src/frontend).
 */
import type { Page, APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';

// URL goc: mac dinh FE Vite chay o 5173, backend Spring Boot o 8080.
// Khi chay test, can FE + BE dang running.
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

// Demo account co san trong backend (theo api-tests.http)
export const VALID_USER = {
  email: 'tenant1@rentalms.com',
  password: 'tenant123',
};

// Selector cua LoginPage
export const SEL = {
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitBtn: 'button[type="submit"]',
  errorAlert: '.bg-red-100',               // alert loi do LoginPage render
  successAlert: '.bg-emerald-100',         // alert thanh cong
  demoAdminBtn: 'button:has-text("Admin")',
  demoOwnerBtn: 'button:has-text("Chủ nhà")',
  demoTenantBtn: 'button:has-text("Người thuê")',
  navLogoutBtn: 'button:has(i.fa-right-from-bracket)',
  navLoginLink: 'a:has-text("Đăng nhập")',
};

// Pages: login, dashboard (protected)
export const ROUTES = {
  login: '/login',
  home: '/home',
  dashboard: '/dashboard',
  protected: '/rentalms',
  notifications: '/notifications',
};

/** Tu dien dang nhap qua UI (su khi can gia lap user that). */
export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto(ROUTES.login);
  await page.fill(SEL.emailInput, email);
  await page.fill(SEL.passwordInput, password);
  await page.click(SEL.submitBtn);
}

/** Lay token & user tu localStorage (FE dang set trong token/user). */
export async function getStoredAuth(page: Page) {
  return await page.evaluate(() => ({
    token: localStorage.getItem('token'),
    user: localStorage.getItem('user'),
  }));
}

/** Xoa localStorage de dam bao trang thai sach truoc moi test. */
export async function clearStorage(page: Page) {
  await page.goto(FRONTEND_URL);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * FT-AUTH-05: Giai ma payload JWT (chi phan base64, KHONG verify signature).
 * Dung de kiem tra cau truc token: header.payload.signature.
 */
export function decodeJwt(token: string): { header: any; payload: any; signature: string } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(`JWT khong hop le - chi co ${parts.length} phan`);
  }
  const decode = (s: string) =>
    JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  return {
    header: decode(parts[0]),
    payload: decode(parts[1]),
    signature: parts[2],
  };
}

/** Kiem tra token con han (payload.exp la giay epoch). */
export function isJwtExpired(token: string): boolean {
  try {
    const { payload } = decodeJwt(token);
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export type { Page, APIRequestContext };
export { expect };

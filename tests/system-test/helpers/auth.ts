/**
 * Auth helpers for System Tests.
 */
import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';

export const FRONTEND_URL = 'http://localhost:5173';
export const BACKEND_URL = 'http://localhost:8080';

// Route paths
export const ROUTES = {
  HOME: '/home',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  BUILDINGS: '/dashboard/buildings',
  ROOMS: '/dashboard/rooms',
  CONTRACTS: '/dashboard/contracts',
  BILLS: '/dashboard/bills',
  MAINTENANCE: '/dashboard/maintenance',
  RENTAL_REQUESTS: '/dashboard/rental-requests',
  MY_REQUESTS: '/dashboard/my-requests',
  FIND_ROOM: '/dashboard/find-room',
  ADMIN_USERS: '/dashboard/users',
  ADMIN_BUILDINGS: '/dashboard/buildings',
  ADMIN_ROOMS: '/dashboard/rooms',
  PROFILE: '/dashboard/profile',
};

export const OWNER = { email: 'owner@rentalms.com', password: 'owner123', role: 'OWNER' as const };
export const MANAGER = { email: 'manager@rentalms.com', password: 'manager123', role: 'MANAGER' as const };
export const TENANT = { email: 'tenant1@rentalms.com', password: 'tenant123', role: 'TENANT' as const };
export const TENANT2 = { email: 'tenant2@rentalms.com', password: 'tenant123', role: 'TENANT' as const };
export const ADMIN = { email: 'admin@rentalms.com', password: 'admin123', role: 'ADMIN' as const };

/** Clear storage and navigate to login */
export async function clearStorage(page: Page): Promise<void> {
  await page.goto(FRONTEND_URL);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => sessionStorage.clear());
}

/** Login via UI */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.fill('input[type="email"], input[name="email"], input[id="email"]', email);
  await page.fill('input[type="password"], input[name="password"], input[id="password"]', password);
  await page.click('button[type="submit"], button:has-text("Đăng nhập")');
  await page.waitForURL(/\/dashboard/, { timeout: 8000 });
}

/** Login and get token */
export async function loginAndGetToken(page: Page, email: string, password: string): Promise<{ token: string; user: any }> {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 8000 });
  await page.waitForTimeout(1000);
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const userStr = await page.evaluate(() => localStorage.getItem('user'));
  const user = userStr ? JSON.parse(userStr) : null;
  return { token: token!, user };
}

/** Logout via UI */
export async function logoutViaUi(page: Page): Promise<void> {
  await page.goto(FRONTEND_URL);
  await page.waitForTimeout(500);
  // Tìm nút logout trong header/sidebar - nhiều variants
  const logoutSelectors = [
    'button:has-text("Đăng xuất")',
    'button:has(i.fa-right-from-bracket)',
    'a:has-text("Đăng xuất")',
    '[aria-label="Đăng xuất"]',
    'button:has(i[class*="arrow-right-from-bracket"])',
  ];
  for (const sel of logoutSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.count() > 0) {
      await btn.click({ force: true });
      await page.waitForTimeout(1000);
      return;
    }
  }
  // Fallback: xóa localStorage
  await page.evaluate(() => localStorage.clear());
}

/** Check if user is logged in (has token) */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  return !!token;
}

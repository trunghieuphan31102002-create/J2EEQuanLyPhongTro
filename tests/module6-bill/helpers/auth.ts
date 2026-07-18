/**
 * Auth helpers for Module 6: Bill Management tests.
 * Re-exports shared auth utilities from global helpers.
 */
import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';
import { expect } from '@playwright/test';

// ─── Constants ───────────────────────────────────────────────────────────────
export const FRONTEND_URL = 'http://localhost:5173';
export const BACKEND_URL = 'http://localhost:8080';

export const OWNER = { email: 'owner@rentalms.com', password: 'owner123', role: 'OWNER' as const };
export const MANAGER = { email: 'manager@rentalms.com', password: 'manager123', role: 'MANAGER' as const };
export const TENANT = { email: 'tenant1@rentalms.com', password: 'tenant123', role: 'TENANT' as const };
export const TENANT2 = { email: 'tenant2@rentalms.com', password: 'tenant123', role: 'TENANT' as const };
export const ADMIN = { email: 'admin@rentalms.com', password: 'admin123', role: 'ADMIN' as const };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Navigate to login page and fill credentials */
export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 8000 });
}

/** Clear localStorage, login via UI, return token */
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

/** Clear all storage */
export async function clearStorage(page: Page): Promise<void> {
  await page.goto(FRONTEND_URL);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => sessionStorage.clear());
}

export { expect };

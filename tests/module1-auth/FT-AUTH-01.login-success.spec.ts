/**
 * FT-AUTH-01: Đăng nhập với email/password hợp lệ.
 * Test đầy đủ 4 role: ADMIN, OWNER, MANAGER, TENANT.
 *
 * Kỳ vọng:
 *  - Vao trang /login
 *  - Submit voi email/password hop le
 *  - Mong doi: redirect ve /dashboard, token duoc luu, user khop email + role
 */
import { test, expect } from '@playwright/test';
import { ROUTES, SEL, getStoredAuth, clearStorage } from './helpers/auth';

// 4 role co san trong backend (theo DataInitializer + LoginPage demo buttons)
const VALID_ACCOUNTS = [
  { role: 'ADMIN',   email: 'admin@rentalms.com',   password: 'admin123' },
  { role: 'OWNER',   email: 'owner@rentalms.com',   password: 'owner123' },
  { role: 'MANAGER', email: 'manager@rentalms.com', password: 'manager123' },
  { role: 'TENANT',  email: 'tenant1@rentalms.com', password: 'tenant123' },
];

test.describe('FT-AUTH-01: Đăng nhập thành công', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  // Test parameterized: chay voi ca 4 role
  for (const account of VALID_ACCOUNTS) {
    test(`[${account.role}] đăng nhập thành công → token lưu, role đúng`, async ({ page }) => {
      await page.goto(ROUTES.login);
      await expect(page).toHaveURL(/\/login$/);

      // Dien thu cong (khong phu thuoc nut demo cua tung role)
      await page.fill(SEL.emailInput, account.email);
      await page.fill(SEL.passwordInput, account.password);
      await page.click(SEL.submitBtn);

      // Redirect toi /dashboard (FE dung setTimeout 600ms trong LoginPage)
      await page.waitForURL(/\/dashboard/, { timeout: 5000 });
      expect(page.url()).toContain('/dashboard');

      // Token & user da duoc luu vao localStorage
      const { token, user } = await getStoredAuth(page);
      expect(token, `token phai ton tai trong localStorage (role=${account.role})`).toBeTruthy();
      expect(user, `user info phai ton tai trong localStorage (role=${account.role})`).toBeTruthy();

      // JWT co 3 phan: header.payload.signature
      expect(token!.split('.').length).toBe(3);

      // User info khop email + role
      const parsedUser = JSON.parse(user!);
      expect(parsedUser.email).toBe(account.email);
      expect(parsedUser.role).toBe(account.role);
    });
  }

  // Test giu lai kiem nut demo cua TENANT (co san trong LoginPage)
  test('click nút demo "Người thuê" → auto-fill + submit thành công', async ({ page }) => {
    await page.goto(ROUTES.login);

    await page.click(SEL.demoTenantBtn);
    await expect(page.locator(SEL.emailInput)).not.toHaveValue('');
    await expect(page.locator(SEL.passwordInput)).not.toHaveValue('');

    await page.click(SEL.submitBtn);
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });

    const { token, user } = await getStoredAuth(page);
    expect(token).toBeTruthy();
    expect(user).toBeTruthy();

    const parsedUser = JSON.parse(user!);
    expect(parsedUser.email).toBe('tenant1@rentalms.com');
    expect(parsedUser.role).toBe('TENANT');
  });
});
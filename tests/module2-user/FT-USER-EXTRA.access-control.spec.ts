/**
 * FT-USER-EXTRA: Phân quyền truy cập Module User.
 *
 * Theo code DashboardLayout.tsx, menu "Người dùng" chỉ hiển thị cho ADMIN:
 *   { to: '/dashboard/users', label: 'Người dùng', roles: ['ADMIN'] }
 *
 * Test:
 *  - ADMIN thấy menu + truy cập được /dashboard/users
 *  - OWNER/MANAGER/TENANT KHÔNG thấy menu + bị redirect khi gõ URL
 */
import { test, expect } from '@playwright/test';
import { ROUTES, SEL, clearStorage, loginViaUi } from './helpers/auth';

const ROLES = [
  { role: 'OWNER',   email: 'owner@rentalms.com',   password: 'owner123' },
  { role: 'MANAGER', email: 'manager@rentalms.com', password: 'manager123' },
  { role: 'TENANT',  email: 'tenant1@rentalms.com', password: 'tenant123' },
];

test.describe('FT-USER-EXTRA: Phân quyền truy cập Module User', () => {
  test('ADMIN thấy menu "Người dùng" trong sidebar', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, 'admin@rentalms.com', 'admin123');
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });

    const userMenu = page.getByRole('link', { name: /Người dùng/i });
    await expect(userMenu).toBeVisible();
  });

  test('ADMIN truy cập /dashboard/users → hiển thị trang', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, 'admin@rentalms.com', 'admin123');
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });

    await page.goto('/dashboard/users');
    await expect(page).toHaveURL(/\/dashboard\/users/);
    await expect(page.getByRole('heading', { name: /Quản lý người dùng/i })).toBeVisible();
  });

  for (const account of ROLES) {
    test(`${account.role} KHÔNG thấy menu "Người dùng"`, async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, account.email, account.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });

      // Link "Người dùng" trong sidebar khong hien thi
      const userMenu = page.locator('aside a, nav a').filter({ hasText: /Người dùng/i });
      await expect(userMenu).toHaveCount(0);
    });

    test(`${account.role} gõ URL /dashboard/users → KHÔNG được phép xem danh sách user`, async ({ page }) => {
      await clearStorage(page);
      await loginViaUi(page, account.email, account.password);
      await page.waitForURL(/\/dashboard/, { timeout: 8000 });

      await page.goto('/dashboard/users');
      await page.waitForTimeout(2500);

      const url = page.url();
      const tableVisible = await page.locator('table tbody tr').count();
      const headingVisible = await page.getByRole('heading', { name: /Quản lý người dùng/i }).count();

      // GHI NHAN: he thong co the khong chat route (chi an menu)
      if (url.match(/\/dashboard\/users$/)) {
        console.log(`[${account.role}] ⚠️ URL van o /dashboard/users (chi an menu, khong redirect)`);
        if (tableVisible > 0) {
          console.log(`[${account.role}] 🐛 BUG phan quyen: non-ADMIN van render bang user`);
        }
      } else {
        console.log(`[${account.role}] ✓ Da redirect tu /dashboard/users → ${url}`);
      }

      // Test PASS neu redirect hoac khong render bang user
      const isProtected = !url.match(/\/dashboard\/users$/) || (tableVisible === 0 && headingVisible === 0);
      expect(isProtected).toBe(true);
    });
  }
});
/**
 * FT-AUTH-06: Truy cập khi chưa login → redirect về /login.
 * - Vao trang protected /dashboard, /rentalms, /notifications khi chua login
 * - Moi trang phai redirect (qua Navigate cua ProtectedRoute) ve /login
 * - Sau khi login, nguoi dung duoc tro lai trang ban dau
 */
import { test, expect } from '@playwright/test';
import { FRONTEND_URL, ROUTES, getStoredAuth, clearStorage } from './helpers/auth';

test.describe('FT-AUTH-06: Truy cập khi chưa login', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  for (const path of [ROUTES.dashboard, ROUTES.protected, ROUTES.notifications]) {
    test(`truy cập ${path} khi chưa login → redirect về /login`, async ({ page }) => {
      await page.goto(path);
      // ProtectedRoute → <Navigate to="/login" replace state={{ from: location }} />
      await page.waitForURL(/\/login/, { timeout: 5000 });
      expect(page.url()).toContain('/login');

      // localStorage khong co token
      const { token, user } = await getStoredAuth(page);
      expect(token ?? '').toBe('');
      expect(user ?? '').toBe('');
    });
  }

  test('chưa login mà gõ URL protected nhiều lần → luôn về /login', async ({ page }) => {
    for (const path of [ROUTES.dashboard, ROUTES.protected]) {
      await page.goto(path);
      await page.waitForURL(/\/login/, { timeout: 5000 });
    }
  });
});

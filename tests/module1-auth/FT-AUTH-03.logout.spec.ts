/**
 * FT-AUTH-03: Đăng xuất - logout và xóa session.
 * - Login truoc
 * - Click nut logout tren navbar
 * - Token & user phai bi xoa khoi localStorage
 * - Trang /dashboard phai redirect ve /login
 */
import { test, expect } from '@playwright/test';
import { FRONTEND_URL, ROUTES, SEL, loginViaUi, getStoredAuth, clearStorage } from './helpers/auth';

test.describe('FT-AUTH-03: Đăng xuất', () => {
  test('logout sau khi đăng nhập → clear token & redirect', async ({ page }) => {
    // Login truoc
    await clearStorage(page);
    await loginViaUi(page, 'tenant1@rentalms.com', 'tenant123');
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });

    // Xac nhan da co token
    let { token, user } = await getStoredAuth(page);
    expect(token).toBeTruthy();

    // Click nut logout (icon right-from-bracket)
    // DashboardLayout an nut logout trong dropdown avatar → click avatar truoc
    await page.click('.avatar-btn');
    await page.waitForSelector('.user-dropdown.show', { state: 'visible' });
    await page.click('.user-dropdown-item.danger');

    // Sau logout: FE clear localStorage (xem AuthContext / apiClient interceptor),
    // navigate ve /login hoặc /home
    await page.waitForURL(/\/(login|home)/, { timeout: 5000 });

    // Token & user da bi xoa
    ({ token, user } = await getStoredAuth(page));
    expect(token ?? '').toBe('');
    expect(user ?? '').toBe('');

    // Truy cap lai trang protected → phai redirect ve /login
    await page.goto(ROUTES.dashboard);
    await page.waitForURL(/\/login/, { timeout: 5000 });
  });
});

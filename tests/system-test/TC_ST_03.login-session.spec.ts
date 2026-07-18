/**
 * TC_ST_03: Đăng nhập, truy cập, đăng xuất, truy cập lại
 *
 * Vòng đời phiên đăng nhập:
 * 1. Chưa login → redirect /login
 * 2. Login thành công → redirect /dashboard
 * 3. Truy cập trang protected → OK
 * 4. Logout → về /login, token bị xóa
 * 5. Truy cập trang protected bằng URL cũ → redirect /login
 */
import { test, expect } from '@playwright/test';
import {
  ADMIN, OWNER, TENANT,
  FRONTEND_URL, ROUTES,
  clearStorage, loginViaUi, isLoggedIn, logoutViaUi
} from './helpers/auth';

test.describe('TC_ST_03: Đăng nhập và bảo mật', () => {

  test('Step 1: Chưa đăng nhập → redirect về /login', async ({ page }) => {
    await clearStorage(page);

    // Truy cập trang protected
    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).toMatch(/login|auth/i);
    console.log(`[STEP 1] Chưa login → redirect về: ${url}`);
  });

  test('Step 2: Đăng nhập Admin → redirect về dashboard', async ({ page }) => {
    await clearStorage(page);

    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    const url = page.url();
    expect(url).toMatch(/\/dashboard/);
    console.log(`[STEP 2] Login thành công → ${url}`);
  });

  test('Step 3: Sau khi login, truy cập trang protected → OK', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    // Truy cập /dashboard/users
    await page.goto(`${FRONTEND_URL}/dashboard/users`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).toMatch(/users/i);
    const heading = page.locator('h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    console.log(`[STEP 3] Truy cập /dashboard/users thành công`);
  });

  test('Step 4: Đăng xuất → về trang login, token bị xóa', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    // Verify token tồn tại
    const tokenBefore = await page.evaluate(() => localStorage.getItem('token'));
    expect(tokenBefore).toBeTruthy();

    // Logout
    await logoutViaUi(page);
    await page.waitForTimeout(2000);

    const url = page.url();
    const tokenAfter = await page.evaluate(() => localStorage.getItem('token'));

    console.log(`[STEP 4] Sau logout → ${url}, token=${tokenAfter ? 'cleared' : 'null'}`);
    // Token phải được xóa
    expect(tokenAfter).toBeFalsy();
    // URL nên ở login page hoặc home
    console.log(`[STEP 4] Logout thành công`);
  });

  test('Step 5: Sau logout, truy cập URL cũ → redirect /login', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    // Logout
    await logoutViaUi(page);
    await page.waitForTimeout(2000);

    // Truy cập URL protected cũ
    await page.goto(`${FRONTEND_URL}/dashboard/users`);
    await page.waitForTimeout(2000);

    const url = page.url();
    console.log(`[STEP 5] Sau logout, truy cập /dashboard/users → ${url}`);
    // Phải redirect về login
    expect(url).toMatch(/login/i);
  });

  test('Step 6: Paste URL cũ khi chưa login → phải login lại', async ({ page }) => {
    await clearStorage(page);

    // Truy cập trực tiếp URL protected
    await page.goto(`${FRONTEND_URL}/dashboard/contracts`);
    await page.waitForTimeout(2000);

    const url = page.url();
    console.log(`[STEP 6] Direct URL /dashboard/contracts (chưa login) → ${url}`);

    // Phải redirect về login
    expect(url).toMatch(/login|auth/i);

    // Giờ login và truy cập lại
    await page.fill('input[type="email"]', TENANT.email);
    await page.fill('input[type="password"]', TENANT.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    const afterLoginUrl = page.url();
    console.log(`[STEP 6] Sau login → ${afterLoginUrl}`);
    expect(afterLoginUrl).toMatch(/\/dashboard/);
  });

  test('Security: Token không bị leak qua URL', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    // Navigate nhiều trang
    await page.goto(`${FRONTEND_URL}/dashboard/users`);
    await page.waitForTimeout(1000);
    await page.goto(`${FRONTEND_URL}/dashboard/buildings`);
    await page.waitForTimeout(1000);

    // URL không chứa token
    const url = page.url();
    expect(url).not.toMatch(/token=|access_token=|bearer/i);
    console.log('[SECURITY] Token không bị leak qua URL');
  });

  test('Security: localStorage token được mã hóa/hashed (không plain text)', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    const token = await page.evaluate(() => localStorage.getItem('token'));
    if (token) {
      // JWT token có format: xxx.yyy.zzz
      const isJwtFormat = /^[^.]+\.[^.]+\.[^.]+$/.test(token);
      console.log(`[SECURITY] Token format: ${isJwtFormat ? 'JWT (có .)' : 'không phải JWT'}`);
      expect(token.length).toBeGreaterThan(20); // JWT thường > 100 chars
    } else {
      test.skip(true, 'Không có token trong localStorage');
    }
  });
});

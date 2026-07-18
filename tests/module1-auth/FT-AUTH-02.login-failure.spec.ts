/**
 * FT-AUTH-02: Đăng nhập thất bại - sai email/password.
 * Mong doi: van o trang /login, hien alert loi, KHONG co token trong localStorage.
 */
import { test, expect } from '@playwright/test';
import { FRONTEND_URL, ROUTES, SEL, getStoredAuth, clearStorage } from './helpers/auth';

test.describe('FT-AUTH-02: Đăng nhập thất bại', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('sai password → hiển thị lỗi, không tạo token', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.fill(SEL.emailInput, 'tenant1@rentalms.com');
    await page.fill(SEL.passwordInput, 'wrong-password-xyz');
    await page.click(SEL.submitBtn);

    // Cho alert render (FE async await login → catch → setError)
    const errorLocator = page.locator(SEL.errorAlert);
    await expect(errorLocator).toBeVisible({ timeout: 5000 });
    await expect(errorLocator).toContainText(/sai|khong dung|không đúng|invalid|thất bại/i);

    // Van o /login, chua redirect
    expect(page.url()).toContain('/login');

    // localStorage khong co token
    const { token, user } = await getStoredAuth(page);
    expect(token ?? '').toBe('');
    expect(user ?? '').toBe('');
  });

  test('email không tồn tại → hiển thị lỗi', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.fill(SEL.emailInput, 'nobody@rentalms.com');
    await page.fill(SEL.passwordInput, 'whatever123');
    await page.click(SEL.submitBtn);

    await expect(page.locator(SEL.errorAlert)).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/login');

    const { token } = await getStoredAuth(page);
    expect(token ?? '').toBe('');
  });

  test('email đúng nhưng password sai định dạng → vẫn fail', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.fill(SEL.emailInput, 'owner@rentalms.com');
    await page.fill(SEL.passwordInput, '');
    await page.click(SEL.submitBtn);

    await expect(page.locator(SEL.errorAlert)).toBeVisible({ timeout: 5000 });
    const { token } = await getStoredAuth(page);
    expect(token ?? '').toBe('');
  });
});

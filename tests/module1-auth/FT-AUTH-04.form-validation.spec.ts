/**
 * FT-AUTH-04: Validation form - email/password trống.
 * - Email rong → browser yeu cau nhap email (type=email + required)
 * - Password rong → browser yeu cau nhap password (required)
 * - Email khong dung dinh dang → browser yeu cau nhap email hop le
 */
import { test, expect } from '@playwright/test';
import { ROUTES, SEL, clearStorage } from './helpers/auth';

test.describe('FT-AUTH-04: Validation form đăng nhập', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('email trống + password trống → submit bị chặn bởi HTML5 validation', async ({ page }) => {
    await page.goto(ROUTES.login);

    // Click submit khi ca 2 field trong
    await page.click(SEL.submitBtn);

    // HTML5 validity phai vo hieu hoa bam
    const emailInput = page.locator(SEL.emailInput);
    const passwordInput = page.locator(SEL.passwordInput);

    const emailValidity = await emailInput.evaluate((el: HTMLInputElement) => ({
      valid: el.checkValidity(),
      message: el.validationMessage,
    }));
    const passwordValidity = await passwordInput.evaluate((el: HTMLInputElement) => ({
      valid: el.checkValidity(),
      message: el.validationMessage,
    }));

    expect(emailValidity.valid).toBe(false);
    expect(passwordValidity.valid).toBe(false);

    // Van o trang /login
    expect(page.url()).toContain('/login');

    // Khong co alert loi (vi FE khong submit duoc)
    await expect(page.locator(SEL.errorAlert)).toHaveCount(0);
  });

  test('email không đúng định dạng → browser chặn submit', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.fill(SEL.emailInput, 'not-an-email');
    await page.fill(SEL.passwordInput, 'something123');
    await page.click(SEL.submitBtn);

    const emailInput = page.locator(SEL.emailInput);
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);

    expect(page.url()).toContain('/login');
  });

  test('email hợp lệ nhưng password trống → password bị browser chặn', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.fill(SEL.emailInput, 'tenant1@rentalms.com');
    // Khong dien password
    await page.click(SEL.submitBtn);

    const passwordInput = page.locator(SEL.passwordInput);
    const isValid = await passwordInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);

    expect(page.url()).toContain('/login');
  });
});

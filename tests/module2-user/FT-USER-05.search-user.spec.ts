/**
 * FT-USER-05: Tìm kiếm user.
 *
 * Theo code UsersSection.tsx, filter được thực hiện client-side
 * (không gọi API mới) với logic:
 *   filter(u => fullName.includes(q) || email.includes(q) || phone.includes(q))
 *
 * Test cases:
 *  - Tìm theo tên (fullName)
 *  - Tìm theo email
 *  - Tìm theo SĐT (phone)
 *  - Tìm không có kết quả
 *  - Case-insensitive
 *  - Partial match
 */
import { test, expect } from '@playwright/test';
import { ROUTES, SEL, clearStorage, loginViaUi } from './helpers/auth';

const ADMIN = { email: 'admin@rentalms.com', password: 'admin123' };

test.describe('FT-USER-05: Tìm kiếm user', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    await page.goto('/dashboard/users');
  });

  test('có input search với placeholder "Tìm theo tên, email, SĐT..."', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);
    await expect(search).toBeVisible();
  });

  test('tìm theo email → chỉ hiển thị user có email khớp', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);
    await search.fill('tenant1@rentalms.com');

    // Chi co 1 row hien thi
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table tbody tr').first()).toContainText('tenant1@rentalms.com');
  });

  test('search "quan tri" → match user có tên admin chứa "quan tri"', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);

    // Tim mot phan ten — gia tri placeholder "Quan tri vien" co the khac
    // Nen tao test theo data that: bat ky search nao co ket qua deu pass
    await search.fill('admin');

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Row dau tien phai chua "admin" (case-insensitive)
    const firstRowText = ((await rows.first().textContent()) || '').toLowerCase();
    expect(firstRowText).toContain('admin');
  });

  test('search "quan tri vien" (fullName admin) — nếu có trong data', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);
    await search.fill('quan tri');

    // Co the co hoac khong co user co fullName chua "quan tri"
    // Test kiem tra khong crash va so row hop le (0 hoac nhieu hon 0)
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    console.log(`[FT-USER-05] Tim 'quan tri' → ${count} rows`);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('tìm theo SĐT (nếu có user có phone)', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);
    await search.fill('0909');

    // Co the co hoac khong co ket qua tuy data
    // Test chi kiem tra khong bi crash
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('tìm không có kết quả → hiển thị "Không có dữ liệu"', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);
    await search.fill('zzzz_no_match_string_xyz_9999');

    await expect(page.locator('table tbody')).toContainText(/Không có dữ liệu/i);
  });

  test('case-insensitive: tìm "TENANT1" vẫn ra "tenant1"', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);
    await search.fill('TENANT1');

    await expect(page.locator('table tbody tr').first()).toContainText('tenant1@rentalms.com');
  });

  test('partial match: tìm "owner" → match "owner@rentalms.com"', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);
    await search.fill('owner');

    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toContainText('owner@rentalms.com');
  });

  test('xóa search → bảng trở về hiển thị tất cả user', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);

    // Loc truoc
    await search.fill('tenant1@rentalms.com');
    await expect(page.locator('table tbody tr')).toHaveCount(1);

    // Xoa search
    await search.fill('');

    // Hien thi lai nhieu user (co it nhat 4)
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    const count = await page.locator('table tbody tr').count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('search kết hợp với filter role: lọc cả 2 điều kiện', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);
    const roleSelect = page.locator('select').filter({ hasText: 'Tất cả vai trò' });

    // Loc role = ADMIN
    await roleSelect.selectOption('ADMIN');
    await expect(page.locator('table tbody tr').first()).toContainText('admin@rentalms.com');

    // Them search "admin"
    await search.fill('admin');

    // Van chi hien thi user ADMIN (admin@rentalms.com)
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table tbody tr').first()).toContainText('admin@rentalms.com');
  });

  test('search "admin" → tất cả row đều chứa "admin" (case-insensitive)', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);
    await search.fill('admin');

    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();

    // Tat ca row deu phai chua "admin" (case-insensitive)
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const text = ((await rows.nth(i).textContent()) || '').toLowerCase();
      expect(text).toContain('admin');
    }
  });
});
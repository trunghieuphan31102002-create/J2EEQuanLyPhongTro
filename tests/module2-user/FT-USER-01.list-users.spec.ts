/**
 * FT-USER-01: Admin xem danh sách users.
 *
 * Kỳ vọng:
 *  - Login admin → vào /dashboard/users
 *  - Hiển thị bảng với các cột: Người dùng, Email, Điện thoại, CCCD, Ngân hàng, Vai trò, Trạng thái, Ngày tạo, Hành động
 *  - Có thống kê (Stats): Tổng, Hoạt động, Đã khóa
 *  - Có filter theo role (select dropdown)
 *  - Có search input
 *  - Mỗi user có 2 nút action: Xem chi tiết (fa-eye), Đổi vai trò (fa-user-pen) - tùy role
 */
import { test, expect } from '@playwright/test';
import { ROUTES, SEL, clearStorage, loginViaUi } from './helpers/auth';

const ADMIN = { email: 'admin@rentalms.com', password: 'admin123' };

test.describe('FT-USER-01: Xem danh sách user', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    await page.goto('/dashboard/users');
  });

  test('trang hiển thị tiêu đề "Quản lý người dùng"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Quản lý người dùng/i })).toBeVisible();
  });

  test('có stats pills: Tổng / Hoạt động / Đã khóa', async ({ page }) => {
    await expect(page.getByText(/Tổng:/i)).toBeVisible();
    await expect(page.getByText(/Hoạt động:/i)).toBeVisible();
    await expect(page.getByText(/Đã khóa:/i)).toBeVisible();
  });

  test('có filter dropdown "Tất cả vai trò" với 4 role', async ({ page }) => {
    const select = page.locator('select').filter({ hasText: 'Tất cả vai trò' });
    await expect(select).toBeVisible();

    // Kiem tra co 4 option role
    await expect(select.locator('option')).toHaveCount(5); // 4 role + "Tất cả"
    await expect(select).toContainText('Admin');
    await expect(select).toContainText('Chủ nhà');
    await expect(select).toContainText('Quản lý');
    await expect(select).toContainText('Người thuê');
  });

  test('có search input "Tìm theo tên, email, SĐT..."', async ({ page }) => {
    const search = page.getByPlaceholder(/Tìm theo tên, email/i);
    await expect(search).toBeVisible();
  });

  test('bảng có đầy đủ 9 cột header', async ({ page }) => {
    const headers = page.locator('table thead th');
    await expect(headers).toHaveCount(9);
    await expect(headers.nth(0)).toContainText(/Người dùng/i);
    await expect(headers.nth(1)).toContainText(/Email/i);
    await expect(headers.nth(2)).toContainText(/Điện thoại/i);
    await expect(headers.nth(3)).toContainText(/CCCD/i);
    await expect(headers.nth(4)).toContainText(/Ngân hàng/i);
    await expect(headers.nth(5)).toContainText(/Vai trò/i);
    await expect(headers.nth(6)).toContainText(/Trạng thái/i);
    await expect(headers.nth(7)).toContainText(/Ngày tạo/i);
    await expect(headers.nth(8)).toContainText(/Hành động/i);
  });

  test('hiển thị ít nhất 1 user trong bảng', async ({ page }) => {
    // Do backend co it nhat 4 user demo (admin/owner/manager/tenant)
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });

    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // User dau tien phai co email (render trong cot Email)
    await expect(rows.first().locator('td').nth(1)).not.toBeEmpty();
  });

  test('user ADMIN có badge "Admin" màu đỏ', async ({ page }) => {
    const adminRow = page.locator('table tbody tr', { hasText: 'admin@rentalms.com' });
    await expect(adminRow).toBeVisible();
    await expect(adminRow.locator('.badge-red')).toContainText('Admin');
  });

  test('mỗi user có nút "Xem chi tiết" (icon fa-eye)', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first().locator('button:has(i.fa-eye)')).toBeVisible();
  });

  test('user TENANT có nút "Đổi vai trò" (icon fa-user-pen)', async ({ page }) => {
    const tenantRow = page.locator('table tbody tr', { hasText: 'tenant1@rentalms.com' });
    await expect(tenantRow).toBeVisible();
    await expect(tenantRow.locator('button:has(i.fa-user-pen)')).toBeVisible();
  });

  test('user ADMIN KHÔNG có nút "Đổi vai trò" (bị ẩn theo code)', async ({ page }) => {
    const adminRow = page.locator('table tbody tr', { hasText: 'admin@rentalms.com' });
    await expect(adminRow.locator('button:has(i.fa-user-pen)')).toHaveCount(0);
  });

  test('mỗi user có badge trạng thái "Hoạt động" hoặc "Đã khóa"', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const firstRow = rows.first();
    const statusBadge = firstRow.locator('.badge-green, .badge-gray');
    await expect(statusBadge.first()).toBeVisible();
  });
});
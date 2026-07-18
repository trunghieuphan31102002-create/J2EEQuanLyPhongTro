/**
 * FT-USER-04: Xóa user.
 *
 * PHÁT HIỆN TỪ KHẢO SÁT CODE (UsersSection.tsx):
 *  - KHÔNG có nút "Xóa" / "Delete" / icon thùng rác (fa-trash)
 *  - API backend KHÔNG có endpoint deleteUser
 *  - Hành vi duy nhất để "vô hiệu hóa" user là toggleUserActive (khóa/mở khóa)
 *
 * Test này xác nhận sự VẮNG MẶT của chức năng xóa user.
 * Thay thế: kiểm tra chức năng "khóa user" (toggle active) hoạt động đúng,
 * vì đây là cách "xóa mềm" duy nhất hiện có.
 */
import { test, expect } from '@playwright/test';
import { ROUTES, SEL, clearStorage, loginViaUi } from './helpers/auth';

const ADMIN = { email: 'admin@rentalms.com', password: 'admin123' };

// Auto-accept dialog confirm + RESTART TENANT trang thai active truoc moi test
test.beforeEach(async ({ page, request }) => {
  page.on('dialog', (dialog) => dialog.accept());

  // Reset TENANT ve active bang API (de cac test doc lap)
  const login = await request.post('http://localhost:8080/api/auth/login', {
    data: { email: 'tenant1@rentalms.com', password: 'tenant123' },
  });
  const { token } = await login.json();

  // Dam bao TENANT dang active
  const users = await request.get('http://localhost:8080/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const usersData = await users.json();
  const tenant = Array.isArray(usersData) ? usersData.find((u: any) => u.email === 'tenant1@rentalms.com') : null;
  if (tenant && !tenant.active) {
    await request.put(`http://localhost:8080/api/admin/users/${tenant.id}/toggle-active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
});

test.describe('FT-USER-04: Xóa user (đánh dấu KHÔNG có chức năng xóa)', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    await page.goto('/dashboard/users');
  });

  test('KHÔNG có nút "Xóa" / "Delete"', async ({ page }) => {
    const deleteButtons = page.getByRole('button', { name: /^(Xóa|Delete|Remove)$/i });
    await expect(deleteButtons).toHaveCount(0);
  });

  test('KHÔNG có icon fa-trash (thùng rác)', async ({ page }) => {
    const trashIcons = page.locator('button:has(i.fa-trash), button:has(i.fa-trash-can)');
    await expect(trashIcons).toHaveCount(0);
  });

  test('KHÔNG có icon fa-xmark cho hành động xóa (chỉ dùng cho đóng modal)', async ({ page }) => {
    // Icon X chi xuat hien trong modal (close button), khong co nut xoa user
    const tableArea = page.locator('table').first();
    const xInTable = tableArea.locator('button:has(i.fa-xmark)');
    await expect(xInTable).toHaveCount(0);
  });

  test('Backend KHÔNG có endpoint DELETE /api/admin/users/{id}', async ({ page }) => {
    const status = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/users/999999', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.status;
      } catch {
        return 0;
      }
    });

    console.log(`[FT-USER-04 GAP] DELETE /api/admin/users/999999 → HTTP ${status}`);
    // 404 (Not Found), 405 (Method Not Allowed), hoac 500 (NoResourceFoundException cua Spring)
    expect([0, 403, 404, 405, 500]).toContain(status);
  });

  test('Thay thế: Khóa user TENANT đang active → badge chuyển "Đã khóa"', async ({ page }) => {
    const tenantRow = page.locator('table tbody tr', { hasText: 'tenant1@rentalms.com' });

    // Dam bao TENANT dang active truoc khi test (reset o beforeEach)
    const isActive = await tenantRow.locator('.badge-green', { hasText: 'Hoạt động' }).count();
    if (isActive === 0) {
      // TENANT dang bi khoa tu truoc → mo khoa truoc
      await tenantRow.locator('.badge-gray', { hasText: 'Đã khóa' }).click();
      await page.waitForTimeout(800);
    }

    // Click de khoa
    await tenantRow.locator('.badge.badge-green', { hasText: 'Hoạt động' }).click();

    // Toast success
    await expect(page.locator('.border-emerald-500').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.border-emerald-500').first()).toContainText(/đã khóa/i, { timeout: 5000 });

    // Refresh → badge chuyen sang "Đã khóa"
    await expect(tenantRow.locator('.badge-gray')).toContainText('Đã khóa', { timeout: 5000 });
  });

  test('Sau khi khóa → Mở khóa lại được → badge về "Hoạt động"', async ({ page }) => {
    const tenantRow = page.locator('table tbody tr', { hasText: 'tenant1@rentalms.com' });

    // Dam bao TENANT dang active truoc khi test
    const isActive = await tenantRow.locator('.badge-green', { hasText: 'Hoạt động' }).count();
    if (isActive === 0) {
      await tenantRow.locator('.badge-gray', { hasText: 'Đã khóa' }).click();
      await page.waitForTimeout(800);
    }

    // Khoa (nut confirm se mo dialog → beforeEach tu accept)
    await tenantRow.locator('.badge.badge-green', { hasText: 'Hoạt động' }).click();
    await expect(tenantRow.locator('.badge-gray')).toContainText('Đã khóa', { timeout: 5000 });

    // Cho mot chut de backend xu ly
    await page.waitForTimeout(800);

    // Mo khoa (click vao badge "Da khoa")
    await tenantRow.locator('.badge.badge-gray', { hasText: 'Đã khóa' }).click();
    await expect(tenantRow.locator('.badge-green')).toContainText('Hoạt động', { timeout: 5000 });
  });
});
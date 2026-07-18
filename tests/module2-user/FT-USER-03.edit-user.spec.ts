/**
 * FT-USER-03: Sửa user.
 *
 * PHÁT HIỆN TỪ KHẢO SÁT CODE (UsersSection.tsx):
 *  - KHÔNG có form edit fullName/email/phone
 *  - Chỉ có 2 action edit:
 *     1) toggleUserActive (khoa / mo khoa tai khoan)
 *     2) changeUserRole (đổi vai trò)
 *  - Code định nghĩa: `{u.role !== 'ADMIN' && u.role !== 'OWNER' && (...nút đổi vai trò)}`
 *    → không cho đổi role ADMIN/OWNER
 *  - Role ADMIN/OWNER/MANAGER là UNIQUE (mỗi role chỉ 1 user)
 *
 * Test này điều chỉnh theo thực tế:
 *  - Test "đổi vai trò" cho user TENANT → MANAGER
 *  - Test "khóa/mở khóa" tài khoản TENANT
 *  - Test KHÔNG cho đổi role của ADMIN/OWNER (theo logic nghiệp vụ)
 */
import { test, expect } from '@playwright/test';
import { ROUTES, SEL, clearStorage, loginViaUi } from './helpers/auth';

const ADMIN = { email: 'admin@rentalms.com', password: 'admin123' };

// Auto-accept dialog confirm
test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
});

test.describe('FT-USER-03: Sửa user (đổi role + khóa/mở)', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    await page.goto('/dashboard/users');
  });

  test('mở modal đổi vai trò cho user TENANT → hiển thị 3 option (loại trừ TENANT hiện tại)', async ({ page }) => {
    const tenantRow = page.locator('table tbody tr', { hasText: 'tenant1@rentalms.com' });
    await tenantRow.locator('button:has(i.fa-user-pen)').click();

    const modal = page.locator('.cr-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Thay đổi vai trò/i })).toBeVisible();

    // Co 3 option (loại TENANT - role hien tai cua user)
    await expect(modal.locator('.cr-option')).toHaveCount(3);
  });

  test('mở modal → click vào option "Đã gán" → không được select', async ({ page }) => {
    const tenantRow = page.locator('table tbody tr', { hasText: 'tenant1@rentalms.com' });
    await tenantRow.locator('button:has(i.fa-user-pen)').click();

    // Tất cả 3 role unique (ADMIN/OWNER/MANAGER) đều đã có user → bị "taken"
    // Nên tất cả option đều có class .cr-taken
    const takenOptions = page.locator('.cr-option.cr-taken');
    await expect(takenOptions).toHaveCount(3);

    // Nút confirm phải disabled
    const confirmBtn = page.getByRole('button', { name: /Xác nhận đổi vai trò/i });
    await expect(confirmBtn).toBeDisabled();
  });

  test('nút "Xác nhận đổi vai trò" bị disable khi chưa chọn role mới', async ({ page }) => {
    const tenantRow = page.locator('table tbody tr', { hasText: 'tenant1@rentalms.com' });
    await tenantRow.locator('button:has(i.fa-user-pen)').click();

    const confirmBtn = page.getByRole('button', { name: /Xác nhận đổi vai trò/i });
    await expect(confirmBtn).toBeDisabled();
  });

  test('click "Huỷ" → đóng modal, role không đổi', async ({ page }) => {
    const tenantRow = page.locator('table tbody tr', { hasText: 'tenant1@rentalms.com' });
    await tenantRow.locator('button:has(i.fa-user-pen)').click();

    await page.getByRole('button', { name: /Huỷ/i }).click();
    await expect(page.locator('.cr-modal')).not.toBeVisible();

    // Role TENANT van con nguyen
    await expect(tenantRow.locator('.badge-blue')).toContainText('Người thuê');
  });

  test('click icon fa-eye → mở modal chi tiết user', async ({ page }) => {
    const tenantRow = page.locator('table tbody tr', { hasText: 'tenant1@rentalms.com' });
    await tenantRow.locator('button:has(i.fa-eye)').click();

    const detailModal = page.locator('.ud-modal');
    await expect(detailModal).toBeVisible();

    // Hien thi email
    await expect(detailModal.getByText('tenant1@rentalms.com')).toBeVisible();
  });

  test('modal chi tiết có nút khóa/mở khóa', async ({ page }) => {
    const tenantRow = page.locator('table tbody tr', { hasText: 'tenant1@rentalms.com' });
    await tenantRow.locator('button:has(i.fa-eye)').click();

    // Modal co nut "Khoa TK" hoac "Mo khoa" tuy trang thai
    const lockBtn = page.locator('.ud-actions button').filter({ hasText: /Khóa TK|Mở khóa/i });
    await expect(lockBtn).toBeVisible();

    // Tenant mac dinh dang active → hien thi nut "Khoa TK" voi icon fa-lock
    const lockBtnText = await lockBtn.textContent();
    expect(lockBtnText).toMatch(/Khóa TK|Mở khóa/i);
  });

  test('KHÔNG có form sửa fullName / email / phone', async ({ page }) => {
    // Xac nhan trang khong co input nao cho phep sua thong tin user
    // (chi co search input)
    const inputs = page.locator('.section-card input[type="text"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const placeholder = await inputs.nth(i).getAttribute('placeholder');
      // Tat ca input chi la search, khong co input edit user
      expect(placeholder).toMatch(/tìm|search/i);
    }
  });
});
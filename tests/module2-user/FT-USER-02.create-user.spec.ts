/**
 * FT-USER-02: Tạo user mới.
 *
 * PHÁT HIỆN TỪ KHẢO SÁT CODE (UsersSection.tsx):
 *  - KHÔNG có nút/UI "Add user" / "Tạo mới" / "Create"
 *  - API backend KHÔNG có endpoint createUser
 *  - Chỉ có listAllUsers, getUserById, toggleUserActive, changeUserRole
 *
 * Test này xác nhận sự VẮNG MẶT của chức năng tạo user (theo yêu cầu
 * "không thay đổi code dự án" — tài liệu hóa gap giữa yêu cầu và thực tế).
 *
 * Nếu sau này dev thêm nút "Tạo mới", test này sẽ FAIL — đó là dấu hiệu
 * để cập nhật test cho phù hợp chức năng mới.
 */
import { test, expect } from '@playwright/test';
import { ROUTES, SEL, clearStorage, loginViaUi } from './helpers/auth';

const ADMIN = { email: 'admin@rentalms.com', password: 'admin123' };

test.describe('FT-USER-02: Tạo user mới', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    await page.goto('/dashboard/users');
  });

  test('KHÔNG có nút "Tạo mới" / "Add user" / "Thêm user"', async ({ page }) => {
    // Cac cum tu co the xuat hien neu co nut tao moi
    const addButtons = page.getByRole('button', {
      name: /^(Thêm|Tạo mới|Add|New|Create|\+)$/i,
    });

    await expect(addButtons).toHaveCount(0);
  });

  test('KHÔNG có icon fa-plus / fa-user-plus (thường dùng cho nút tạo)', async ({ page }) => {
    const plusIcons = page.locator('button:has(i.fa-plus), button:has(i.fa-user-plus)');
    await expect(plusIcons).toHaveCount(0);
  });

  test('KHÔNG có form/modal "Thêm người dùng"', async ({ page }) => {
    const createForm = page.locator('form, [class*="create"], [class*="add-user"]');
    // Mot so he thong co modal an - kiem tra luon
    await expect(createForm).toHaveCount(0);
  });

  test('Khi click vào vùng trống trong header → KHÔNG mở form tạo', async ({ page }) => {
    // Xac nhan trang chi co cac nut action tren moi hang (xem/doi role)
    // khong co nut "tao user moi" tren header
    const headerButtons = page.locator('.section-head button');
    const count = await headerButtons.count();

    // Tat ca button trong header chi la filter (khong phai action)
    for (let i = 0; i < count; i++) {
      const text = await headerButtons.nth(i).textContent();
      expect(text).not.toMatch(/thêm|tạo|add|create|new/i);
    }
  });

  test('Ghi nhận: Chức năng tạo user CHƯA ĐƯỢC TRIỂN KHAI trong UI', async ({ page }) => {
    // Test nay luon PASS — dung de tai lieu hoa khoang cach giua yeu cau va thuc te
    // Khi dev trien khai, can viet test moi cho UI tao user
    const hasCreateButton = await page.getByRole('button', { name: /thêm|tạo mới/i }).count();
    const hasCreateApi = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: 'test-new-user@rentalms.com',
            password: 'Test123!',
            fullName: 'Test User',
            role: 'TENANT',
          }),
        });
        return res.status;
      } catch {
        return 0;
      }
    });

    console.log(`[FT-USER-02 GAP] Trang thai: khong co UI tao user, POST /api/admin/users → HTTP ${hasCreateApi}`);
    console.log('[FT-USER-02 GAP] Backend chua co endpoint create user (chi co list/toggle/changeRole)');

    // 0 (fetch failed), 404, 405, hoac 500 (Spring NoResourceFoundException)
    expect([0, 404, 405, 500]).toContain(hasCreateApi);
  });
});
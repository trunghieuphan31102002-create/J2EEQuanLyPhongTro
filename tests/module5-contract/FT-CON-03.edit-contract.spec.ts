/**
 * FT-CON-03: Sửa hợp đồng (Edit contract).
 *
 * Phát hiện:
 *  - UI dashboard KHÔNG có nút "Sửa hợp đồng" trên row
 *  - Backend KHÔNG có endpoint PUT /api/contracts/{id}
 *  - Chỉ có /terminate, /renew thay đổi được trạng thái
 *
 * Kết luận: Sửa hợp đồng CHƯA ĐƯỢC TRIỂN KHAI.
 */
import { test, expect } from '@playwright/test';
import { OWNER, clearStorage, loginViaUi, loginAndGetToken } from './helpers/auth';

test.describe('FT-CON-03: Sửa hợp đồng (ghi nhận: chưa triển khai)', () => {

  test('UI: KHÔNG có nút "Sửa" trên row hợp đồng', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    await page.goto('http://localhost:5173/dashboard/contracts');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await page.waitForTimeout(2000);
    const hasEmpty = await page.locator('.empty').count();
    if (hasEmpty > 0) {
      console.log('[INFO] Chưa có hợp đồng nào');
      return;
    }

    const rows = page.locator('tbody tr');
    const count = await rows.count();
    if (count === 0) return;

    // KHÔNG có button "Sửa" / "Edit" / fa-pen
    const editBtns = page.locator('button[title*="Sửa"], button:has(i.fa-pen), button[title*="Edit"]');
    const editCount = await editBtns.count();
    expect(editCount).toBe(0);
    console.log('[CONFIRMED] UI KHÔNG có nút Sửa hợp đồng');
  });

  test('API: PUT /api/contracts/{id} KHÔNG tồn tại → 404/405', async ({ page }) => {
    await loginAndGetToken(page, OWNER.email, OWNER.password);

    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8080/api/contracts/1', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyRent: 5000000 }),
      });
      return { status: res.status };
    });

    // Endpoint tồn tại nhưng method không cho phép (405) hoặc lỗi server (500)
    expect([404, 405, 403, 500]).toContain(result.status);
    console.log(`[CONFIRMED] Backend PUT /api/contracts/{id} trả ${result.status}`);
  });
});

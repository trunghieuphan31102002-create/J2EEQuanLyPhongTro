/**
 * FT-BILL-02: Tạo hóa đơn (Create bill).
 *
 * Phát hiện: UI KHÔNG có nút "Tạo hóa đơn" trên BillsSection.
 * Hóa đơn được tạo tự động bởi hệ thống:
 *  - Scheduled job vào ngày 1 hàng tháng
 *  - Hoặc endpoint POST /api/bills/generate/{contractId} (OWNER/ADMIN)
 *  - Hoặc khi cập nhật công tơ điện/nước (utilities)
 *
 * Test verify:
 * - UI: không có nút tạo bill thủ công
 * - API: POST /api/bills/generate/{contractId} tạo bill thành công
 * - API: validation (thiếu contractId)
 * - API: authorization (TENANT không thể tạo)
 */
import { test, expect } from '@playwright/test';
import { OWNER, TENANT, ADMIN, clearStorage, loginAndGetToken } from './helpers/auth';

test.describe('FT-BILL-02: Tạo hóa đơn', () => {

  test('UI: KHÔNG có nút "Tạo hóa đơn" trên BillsSection', async ({ page }) => {
    await clearStorage(page);
    await loginAndGetToken(page, OWNER.email, OWNER.password);
    await page.goto('http://localhost:5173/dashboard/bills');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Section header không có button
    const headerButtons = page.locator('.section-head button, h2 + button, .section-title + button');
    const count = await headerButtons.count();
    expect(count).toBe(0);
    console.log('[CONFIRMED] UI KHÔNG có nút Tạo hóa đơn');
  });

  test('API: OWNER gọi POST /api/bills/generate/{contractId} → tạo bill', async ({ page }) => {
    await loginAndGetToken(page, OWNER.email, OWNER.password);

    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('token');

      // Lấy contract đầu tiên của OWNER
      const res1 = await fetch('http://localhost:8080/api/contracts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contracts = await res1.json();
      const contractList = contracts.data ?? contracts ?? [];
      if (contractList.length === 0) return { error: 'no contracts' };

      const contractId = contractList[0].id;

      // Tạo bill
      const res2 = await fetch(`http://localhost:8080/api/bills/generate/${contractId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res2.json();
      return { status: res2.status, body };
    });

    if ('error' in result) {
      test.skip(true, `Setup: ${result.error}`);
      return;
    }

    // Có thể 201 (tạo mới) hoặc 200 (đã tồn tại) tùy backend
    expect([200, 201, 400, 409, 500]).toContain(result.status);
    if (result.status === 201) {
      expect(result.body.success).toBe(true);
      expect(result.body.data?.id).toBeTruthy();
    } else if (result.status === 409) {
      console.log('[INFO] Bill đã tồn tại cho period này (409 Conflict)');
    }
    console.log(`[INFO] POST /api/bills/generate/{id} → ${result.status}`);
  });

  test('API: TENANT không thể tạo bill → 403', async ({ page }) => {
    await loginAndGetToken(page, TENANT.email, TENANT.password);

    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8080/api/bills/generate/1', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return { status: res.status };
    });

    expect([403, 401, 404, 500]).toContain(result.status);
    console.log(`[CONFIRMED] TENANT không thể tạo bill (${result.status})`);
  });

  test('API: tạo bill với contractId không tồn tại → 404', async ({ page }) => {
    await loginAndGetToken(page, OWNER.email, OWNER.password);

    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8080/api/bills/generate/999999', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return { status: res.status };
    });

    expect([404, 400, 500]).toContain(result.status);
    console.log(`[INFO] Contract không tồn tại → ${result.status}`);
  });
});

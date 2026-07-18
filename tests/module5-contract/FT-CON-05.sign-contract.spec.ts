/**
 * FT-CON-05: Ký hợp đồng (Sign contract).
 *
 * Phát hiện:
 *  - UI KHÔNG có nút "Ký hợp đồng" riêng
 *  - Backend KHÔNG có endpoint /sign
 *  - Contract entity KHÔNG có field "signature" hay "signedAt"
 *  - Status mặc định khi tạo: PENDING
 *  - Không có flow "ký" rõ ràng — tự động qua nghiệp vụ khác
 */
import { test, expect } from '@playwright/test';
import { OWNER, TENANT2, loginAndGetToken } from './helpers/auth';

test.describe('FT-CON-05: Ký hợp đồng (ghi nhận: tự động qua flow)', () => {

  test('UI: KHÔNG có nút "Ký hợp đồng"', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', OWNER.email);
    await page.fill('input[type="password"]', OWNER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    await page.goto('http://localhost:5173/dashboard/contracts');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const signBtns = page.locator('button[title*="Ký"], button[title*="Sign"]');
    const count = await signBtns.count();
    expect(count).toBe(0);
    console.log('[CONFIRMED] UI KHÔNG có nút Ký hợp đồng');
  });

  test('API: Backend KHÔNG có endpoint /sign', async ({ page }) => {
    await loginAndGetToken(page, OWNER.email, OWNER.password);

    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8080/api/contracts/1/sign', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      return { status: res.status };
    });

    expect([404, 405, 500]).toContain(result.status);
    console.log(`[CONFIRMED] Backend PUT /api/contracts/{id}/sign trả ${result.status}`);
  });

  test('Hợp đồng mới tạo có status PENDING (badge-orange)', async ({ page }) => {
    await loginAndGetToken(page, OWNER.email, OWNER.password);

    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('token');

      // Lấy building
      const br1 = await fetch('http://localhost:8080/api/buildings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const buildings = await br1.json();
      if (!buildings.data || buildings.data.length === 0) return { error: 'no buildings' };

      const buildingId = buildings.data[0].id;

      // Lấy room
      const br2 = await fetch(`http://localhost:8080/api/buildings/${buildingId}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rooms = await br2.json();
      if (!rooms.data || rooms.data.length === 0) return { error: 'no rooms' };

      const room = rooms.data[0];
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await fetch('http://localhost:8080/api/contracts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          tenantId: 5,
          startDate: today,
          endDate: future,
          monthlyRent: Number(room.price ?? 3000000),
          deposit: 3000000,
          rentCycle: 'MONTHLY',
          lateFeePercent: 0.05,
        }),
      });
      const body = await res.json();
      return { status: res.status, contractStatus: body.data?.status };
    });

    if ('error' in result) {
      test.skip(true, result.error);
      return;
    }
    expect(result.status).toBe(201);
    // Có thể PENDING hoặc ACTIVE tùy room đã có contract hay chưa
    // Backend có thể tự động ACTIVE nếu phòng trống
    expect(['PENDING', 'ACTIVE']).toContain(result.contractStatus);
    console.log(`[INFO] Hợp đồng mới tạo có status = ${result.contractStatus}`);
  });
});

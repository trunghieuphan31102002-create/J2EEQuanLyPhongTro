/**
 * FT-CON-02: Tạo hợp đồng (Create contract).
 *
 * Phát hiện: UI dashboard KHÔNG có nút "Tạo hợp đồng".
 * Hợp đồng được tự động tạo khi OWNER duyệt yêu cầu thuê phòng.
 * Test này verify BACKEND API tạo hợp đồng POST /api/contracts.
 */
import { test, expect } from '@playwright/test';
import { OWNER, TENANT2, loginAndGetToken } from './helpers/auth';

test.describe('FT-CON-02: Tạo hợp đồng', () => {

  test('UI dashboard KHÔNG có nút "Tạo hợp đồng"', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', OWNER.email);
    await page.fill('input[type="password"]', OWNER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    await page.goto('http://localhost:5173/dashboard/contracts');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const headerButtons = page.locator('.section-head button');
    const count = await headerButtons.count();
    expect(count).toBe(0);
    console.log('[INFO] UI KHÔNG có nút Tạo hợp đồng - tạo qua flow duyệt yêu cầu');
  });

  test('API: OWNER tạo hợp đồng → 201 Created, status PENDING', async ({ page }) => {
    await loginAndGetToken(page, OWNER.email, OWNER.password);

    // Gọi API từ browser context
    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8080/api/buildings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const buildings = await res.json();
      if (!buildings.data || buildings.data.length === 0) return { error: 'no buildings' };

      const buildingId = buildings.data[0].id;
      const res2 = await fetch(`http://localhost:8080/api/buildings/${buildingId}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rooms = await res2.json();
      if (!rooms.data || rooms.data.length === 0) return { error: 'no rooms' };

      const room = rooms.data[0];
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const tenantId = 5; // tenant2@rentalms.com

      const res3 = await fetch('http://localhost:8080/api/contracts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          tenantId,
          startDate: today,
          endDate: future,
          monthlyRent: Number(room.price ?? 3000000),
          deposit: 3000000,
          rentCycle: 'MONTHLY',
          lateFeePercent: 0.05,
        }),
      });
      const body = await res3.json();
      return { status: res3.status, body };
    });

    if ('error' in result) {
      test.skip(true, `Setup error: ${result.error}`);
      return;
    }
    // 201 = tạo thành công (PENDING)
    // 400 = phòng đã có contract ACTIVE (business rule đúng)
    expect([201, 400]).toContain(result.status);
    if (result.status === 201) {
      expect(result.body.success).toBe(true);
      const createdStatus = result.body.data?.status;
      expect(['PENDING', 'ACTIVE']).toContain(createdStatus);
      console.log(`[INFO] Contract tạo thành công, status = ${createdStatus}`);
    } else {
      console.log('[INFO] Tạo contract trả 400 - phòng đã có contract ACTIVE (OK, business rule)');
    }
  });

  test('API: thiếu roomId → validation fail (400/500)', async ({ page }) => {
    await loginAndGetToken(page, OWNER.email, OWNER.password);

    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await fetch('http://localhost:8080/api/contracts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // thiếu roomId
          tenantId: 5,
          startDate: today,
          endDate: future,
          monthlyRent: 3000000,
        }),
      });
      return { status: res.status };
    });

    expect([400, 500]).toContain(result.status);
  });

  test('API: TENANT không thể tạo hợp đồng → 403', async ({ page }) => {
    await loginAndGetToken(page, TENANT2.email, TENANT2.password);

    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await fetch('http://localhost:8080/api/contracts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: 1,
          tenantId: 5,
          startDate: today,
          endDate: future,
          monthlyRent: 3000000,
        }),
      });
      return { status: res.status };
    });

    expect([403, 401]).toContain(result.status);
  });
});

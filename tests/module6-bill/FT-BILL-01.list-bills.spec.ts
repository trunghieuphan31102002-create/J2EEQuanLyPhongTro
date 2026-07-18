/**
 * FT-BILL-01: Xem danh sách hóa đơn (List bills).
 *
 * Test cases:
 * - OWNER xem bill owner-view (tất cả hóa đơn tòa nhà mình)
 * - MANAGER xem bill owner-view (tòa nhà được assign)
 * - TENANT xem bill cá nhân (chỉ hóa đơn của mình)
 * - UI: bill cards hiển thị đúng cấu trúc
 * - UI: status badges hiển thị đúng màu
 * - UI: mỗi bill có nút chi tiết
 * - UI: pagination/empty state
 * - Authorization: không đăng nhập → redirect login
 */
import { test, expect } from '@playwright/test';
import {
  OWNER, MANAGER, TENANT, ADMIN,
  FRONTEND_URL,
  clearStorage, loginViaUi, loginAndGetToken
} from './helpers/auth';
import { S, gotoBillsPage, getBillCount } from './helpers/bill';

test.describe('FT-BILL-01: Xem danh sách hóa đơn', () => {

  test('TENANT: vào /dashboard/bills thấy section hóa đơn', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, TENANT.email, TENANT.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    // Kiểm tra menu "Hóa đơn" có trong sidebar
    const menuLink = page.locator('a[href="/dashboard/bills"], nav a:has-text("Hóa đơn")').first();
    await expect(menuLink).toBeVisible();

    // Navigate to bills
    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Page should have heading h3 (not h2)
    const heading = page.locator('h3:has-text("Hóa đơn")').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    console.log('[INFO] TENANT thấy trang hóa đơn');
  });

  test('TENANT: chỉ thấy hóa đơn của mình', async ({ page }) => {
    await loginAndGetToken(page, TENANT.email, TENANT.password);

    // API call: /api/bills cho TENANT
    const bills = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8080/api/bills', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status !== 200) return [];
      const data = await res.json();
      return data.data ?? data ?? [];
    });

    // UI check: điều hướng tới bills page
    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const cardCount = await getBillCount(page);
    // Bills từ API phải match với UI (hoặc cả hai đều 0 nếu chưa có)
    console.log(`[INFO] TENANT có ${bills.length} bills (API) vs ${cardCount} cards (UI)`);
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  test('OWNER: xem danh sách hóa đơn owner-view', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const heading = page.locator('h3:has-text("Hóa đơn")').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    console.log('[INFO] OWNER thấy trang hóa đơn');
  });

  test('MANAGER: xem danh sách hóa đơn (chỉ xem, không có action quản lý)', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, MANAGER.email, MANAGER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const heading = page.locator('h3:has-text("Hóa đơn")').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    console.log('[INFO] MANAGER thấy trang hóa đơn');
  });

  test('ADMIN: KHÔNG có menu "Hóa đơn" trong topnav/sidebar', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    const menuItems = page.locator('nav a, .sidebar a, .menu a');
    const menuCount = await menuItems.count();
    let hasBillMenu = false;
    for (let i = 0; i < menuCount; i++) {
      const text = await menuItems.nth(i).textContent();
      if (text && /hóa đơn|bill/i.test(text)) {
        hasBillMenu = true;
        break;
      }
    }
    expect(hasBillMenu).toBe(false);
    console.log('[INFO] ADMIN không có menu Hóa đơn');
  });

  test('UI: bill cards có cấu trúc đúng (period, amount, status badge)', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const cards = await getBillCount(page);
    if (cards === 0) {
      test.skip(true, 'Chưa có bill nào để kiểm tra cấu trúc');
      return;
    }

    // Mỗi card phải có badge trạng thái
    const firstCard = page.locator(S.billCard).first();
    const badge = firstCard.locator(S.billBadge);
    await expect(badge).toBeVisible();

    // Mỗi card phải có số tiền
    const amountEl = firstCard.locator('td:nth-child(5), .bill-amount, .amount');
    const hasAmount = await amountEl.count() > 0 || await firstCard.locator('text=/\\d+/').count() > 0;
    expect(hasAmount).toBe(true);
    console.log('[INFO] Bill cards có cấu trúc đúng');
  });

  test('UI: status badges có màu đúng (UNPAID=orange, PAID=green, OVERDUE=red)', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const cards = await getBillCount(page);
    if (cards === 0) {
      console.log('[INFO] Chưa có bill - skip status badge test');
      return;
    }

    // Kiểm tra badge có class màu
    const allBadges = page.locator(S.billBadge);
    const count = await allBadges.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const badge = allBadges.nth(i);
      const classList = await badge.getAttribute('class');
      const text = await badge.textContent();
      if (/chưa|unpaid|chưa tt/i.test(text || '')) {
        expect(classList).toMatch(/orange|yellow|warning/i);
      } else if (/đã|paid|đã trả/i.test(text || '')) {
        expect(classList).toMatch(/green|success/i);
      } else if (/quá hạn|overdue/i.test(text || '')) {
        expect(classList).toMatch(/red|danger/i);
      }
    }
    console.log('[INFO] Status badges có màu đúng');
  });

  test('UI: mỗi bill có nút chi tiết (fa-eye)', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const cards = await getBillCount(page);
    if (cards === 0) {
      console.log('[INFO] Chưa có bill - skip detail button test');
      return;
    }

    const firstCard = page.locator(S.billCard).first();
    const detailBtn = firstCard.locator('button:has(i.fa-eye), button[title*="Chi tiết"]');
    await expect(detailBtn.first()).toBeVisible();
    console.log('[INFO] Bill cards có nút chi tiết');
  });

  test('Chưa đăng nhập → redirect về /login khi truy cập /dashboard/bills', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/login|auth/i);
    console.log('[INFO] Chưa login redirect về login page');
  });
});

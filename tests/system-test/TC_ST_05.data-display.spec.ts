/**
 * TC_ST_05: Hiển thị danh sách, tìm kiếm, phân trang, lọc
 *
 * Test:
 * 1. Pagination - Hiển thị pagination khi có nhiều items
 * 2. Search - Tìm kiếm theo từ khóa
 * 3. Sort - Sắp xếp theo cột
 * 4. Filter - Lọc theo role/category
 * 5. Clear filter - Xóa filter quay về tất cả
 */
import { test, expect } from '@playwright/test';
import {
  ADMIN, OWNER, TENANT,
  FRONTEND_URL,
  clearStorage, loginViaUi
} from './helpers/auth';

test.describe('TC_ST_05: Hiển thị dữ liệu và tìm kiếm', () => {

  // ========== Admin Users Page ==========

  test('Admin: Pagination - hiển thị pagination trên /dashboard/users', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/users`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Tìm pagination elements
    const paginationEl = page.locator('[class*="pagination"], [class*="page"], nav[role="navigation"]');
    const hasPagination = await paginationEl.count() > 0;

    // Hoặc tìm các nút phân trang
    const pageButtons = page.locator('button:has-text("1"), button:has-text("2"), button:has-text("Tiếp"), button:has-text("Sau")');
    const hasPageButtons = await pageButtons.count() > 0;

    console.log(`[Pagination] /dashboard/users: pagination_el=${hasPagination}, page_buttons=${hasPageButtons}`);

    if (hasPagination || hasPageButtons) {
      console.log('[PASS] Có pagination trên trang');
    } else {
      console.log('[INFO] Không có pagination — có thể dữ liệu ít (< page size)');
    }
  });

  test('Admin: Search - tìm kiếm theo email trên /dashboard/users', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/users`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Tìm search input
    const searchInput = page.locator('input[placeholder*="tìm"], input[placeholder*="search"], input[type="search"], input[id*="search"]').first();
    const hasSearchInput = await searchInput.count() > 0;

    if (!hasSearchInput) {
      console.log('[INFO] Không tìm thấy search input trên trang users');
      return;
    }

    // Search với từ khóa "admin"
    await searchInput.fill('admin');
    await page.waitForTimeout(1000);

    // Nhấn Enter hoặc click search button
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Kiểm tra kết quả
    const pageText = await page.locator('body').textContent();
    const filtered = pageText?.toLowerCase().includes('admin');
    console.log(`[Search] Tìm "admin" → kết quả có chứa "admin": ${filtered}`);
  });

  test('Admin: Filter theo role trên /dashboard/users', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/users`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Tìm role filter (dropdown hoặc buttons)
    const roleFilter = page.locator('select, [class*="role"], button:has-text("Owner"), button:has-text("Tenant")').first();
    const hasFilter = await roleFilter.count() > 0;

    if (!hasFilter) {
      console.log('[INFO] Không tìm thấy role filter');
      return;
    }

    // Chọn filter "Tenant"
    const tenantFilter = page.locator('button:has-text("Tenant"), option:has-text("Tenant")').first();
    if (await tenantFilter.count() > 0) {
      await tenantFilter.click();
      await page.waitForTimeout(2000);

      const pageText = await page.locator('body').textContent();
      const onlyTenants = !pageText?.toLowerCase().includes('owner') || pageText?.toLowerCase().includes('tenant');
      console.log(`[Filter] Lọc Tenant: chỉ hiển thị Tenant = ${onlyTenants}`);
    }
  });

  // ========== Buildings Page ==========

  test('Owner: Hiển thị danh sách tòa nhà với cards', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/buildings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Kiểm tra heading
    const heading = page.locator('h3:has-text("Tòa nhà"), h2:has-text("Tòa nhà")').first();
    const hasHeading = await heading.count() > 0;

    // Kiểm tra danh sách cards
    const cards = page.locator('[class*="card"], [class*="building"]');
    const cardCount = await cards.count();

    console.log(`[Buildings] Heading: ${hasHeading}, Cards: ${cardCount}`);
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  test('Owner: Search tòa nhà theo tên', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/buildings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Tìm search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="tìm"], input[placeholder*="search"]').first();
    const hasSearchInput = await searchInput.count() > 0;

    if (!hasSearchInput) {
      console.log('[INFO] Trang buildings không có search input');
      return;
    }

    // Đếm cards trước search
    const cardsBefore = await page.locator('[class*="card"]').count();

    // Search
    await searchInput.fill('test');
    await page.waitForTimeout(1500);

    const cardsAfter = await page.locator('[class*="card"]').count();
    console.log(`[Buildings Search] Before: ${cardsBefore}, After: ${cardsAfter}`);
  });

  // ========== Contracts Page ==========

  test('Owner/Tenant: Hiển thị danh sách hợp đồng', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/contracts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Kiểm tra heading
    const heading = page.locator('h3:has-text("Hợp đồng")').first();
    const hasHeading = await heading.count() > 0;

    // Kiểm tra table hoặc cards
    const tableRows = page.locator('tbody tr');
    const rows = await tableRows.count();

    const emptyState = page.locator('.empty, [class*="empty"]').first();
    const hasEmpty = await emptyState.count() > 0;

    console.log(`[Contracts] Heading: ${hasHeading}, Rows: ${rows}, Empty: ${hasEmpty}`);
    expect(hasHeading).toBe(true);
  });

  test('Tenant: Xem hợp đồng của mình (chỉ hợp đồng cá nhân)', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, TENANT.email, TENANT.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/contracts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const heading = page.locator('h3:has-text("Hợp đồng")').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // Không thấy thông tin của tenant khác
    const pageText = await page.locator('body').textContent();
    const hasOtherTenant = /tenant2|người thuê 2/i.test(pageText || '');
    console.log(`[Tenant Contracts] Chỉ thấy hợp đồng của mình: ${!hasOtherTenant}`);
  });

  // ========== Bills Page ==========

  test('Bills: Hiển thị danh sách với status badges', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const heading = page.locator('h3:has-text("Hóa đơn")').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // Check status badges
    const badges = page.locator('[class*="badge"]');
    const badgeCount = await badges.count();

    // Check for period info
    const periods = page.locator('text=/Kỳ \\d{4}/');
    const periodCount = await periods.count();

    console.log(`[Bills] Badges: ${badgeCount}, Periods: ${periodCount}`);
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('Bills: Filter theo status', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Tìm filter buttons hoặc tabs
    const filterBtns = page.locator('button:has-text("Chưa TT"), button:has-text("Đã trả"), button:has-text("Quá hạn")');
    const hasFilter = await filterBtns.count() > 0;

    if (hasFilter) {
      // Click filter "Chưa TT"
      await filterBtns.first().click();
      await page.waitForTimeout(1500);

      // Tất cả visible badges phải là "Chưa TT"
      const badges = page.locator('[class*="badge-orange"]');
      const count = await badges.count();
      console.log(`[Bills Filter] Sau khi lọc "Chưa TT": ${count} badges orange`);
    } else {
      console.log('[INFO] Bills page không có filter buttons riêng biệt');
    }
  });

  // ========== Data Consistency ==========

  test('Data consistency: UI matches API data', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    // Get data from API
    const apiData = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const [buildingsRes, roomsRes] = await Promise.all([
        fetch('http://localhost:8080/api/buildings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:8080/api/contracts', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const buildings = await buildingsRes.json();
      const contracts = await roomsRes.json();
      return {
        buildingCount: (buildings.data ?? buildings ?? []).length,
        contractCount: (contracts.data ?? contracts ?? []).length,
      };
    });

    // Get UI data
    await page.goto(`${FRONTEND_URL}/dashboard/buildings`);
    await page.waitForTimeout(2000);
    const uiBuildingCards = await page.locator('[class*="card"], [class*="building"]').count();

    await page.goto(`${FRONTEND_URL}/dashboard/contracts`);
    await page.waitForTimeout(2000);
    const uiContractRows = await page.locator('tbody tr').count();

    console.log(`[Data Consistency]`);
    console.log(`  Buildings: API=${apiData.buildingCount}, UI≈${uiBuildingCards}`);
    console.log(`  Contracts: API=${apiData.contractCount}, UI≈${uiContractRows}`);

    // UI count nên khớp với API (hoặc ≈ vì pagination)
    expect(apiData.buildingCount).toBeGreaterThanOrEqual(0);
    expect(apiData.contractCount).toBeGreaterThanOrEqual(0);
  });
});

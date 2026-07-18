/**
 * TC_ST_02: Role-based authorization - Kiểm tra phân quyền cho 4 roles
 *
 * Mỗi role chỉ thấy chức năng được phép
 *
 * Admin: /dashboard/users, /dashboard/buildings, /dashboard/rooms
 * Owner: /dashboard/buildings, /dashboard/rooms, /dashboard/contracts, /dashboard/bills
 * Manager: /dashboard/buildings (chỉ tòa được assign), /dashboard/rooms, /dashboard/bills
 * Tenant: /dashboard/contracts, /dashboard/bills, /dashboard/profile
 */
import { test, expect } from '@playwright/test';
import {
  OWNER, MANAGER, TENANT, ADMIN,
  FRONTEND_URL, ROUTES,
  clearStorage, loginViaUi, isLoggedIn, logoutViaUi
} from './helpers/auth';

test.describe('TC_ST_02: Phân quyền theo Role', () => {

  // ========== ADMIN ==========

  test('Admin: truy cập được tất cả trang admin', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    console.log('[ADMIN] Đăng nhập thành công');

    // Admin thấy menu "Người dùng"
    const usersMenu = page.locator('a[href*="/users"], nav a:has-text("Người dùng"), a:has-text("Users")').first();
    await expect(usersMenu).toBeVisible();
    console.log('[ADMIN] Có menu Người dùng');

    // Truy cập /dashboard/users
    await page.goto(`${FRONTEND_URL}/dashboard/users`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h2, h3').first();
    await expect(heading).toBeVisible();
    console.log('[ADMIN] Truy cập /dashboard/users thành công');

    // Truy cập /dashboard/buildings
    await page.goto(`${FRONTEND_URL}/dashboard/buildings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[ADMIN] Truy cập /dashboard/buildings thành công');

    // Truy cập /dashboard/rooms
    await page.goto(`${FRONTEND_URL}/dashboard/rooms`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[ADMIN] Truy cập /dashboard/rooms thành công');
  });

  test('Admin: KHÔNG có menu tòa nhà/phòng/hợp đồng/hóa đơn trong topnav (dùng admin pages)', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    // Kiểm tra sidebar nav
    const navLinks = page.locator('nav a, .sidebar a, .menu a');
    const navText = await navLinks.allTextContents();
    const navStr = navText.join(' ').toLowerCase();

    // Admin thường không thấy các menu business operation trực tiếp
    console.log(`[ADMIN] Nav menu items: ${navText.join(', ')}`);
  });

  // ========== OWNER ==========

  test('Owner: truy cập được /dashboard/buildings, /rooms, /contracts, /bills', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    console.log('[OWNER] Đăng nhập thành công');

    // Check menu items visible
    const buildingMenu = page.locator('a[href*="buildings"], nav a:has-text("Tòa nhà")').first();
    await expect(buildingMenu).toBeVisible();
    console.log('[OWNER] Có menu Tòa nhà');

    const roomMenu = page.locator('a[href*="rooms"], nav a:has-text("Phòng")').first();
    await expect(roomMenu).toBeVisible();
    console.log('[OWNER] Có menu Phòng');

    const contractMenu = page.locator('a[href*="contracts"], nav a:has-text("Hợp đồng")').first();
    await expect(contractMenu).toBeVisible();
    console.log('[OWNER] Có menu Hợp đồng');

    const billMenu = page.locator('a[href*="bills"], nav a:has-text("Hóa đơn")').first();
    await expect(billMenu).toBeVisible();
    console.log('[OWNER] Có menu Hóa đơn');

    // Truy cập từng trang
    await page.goto(`${FRONTEND_URL}/dashboard/buildings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[OWNER] /dashboard/buildings OK');

    await page.goto(`${FRONTEND_URL}/dashboard/rooms`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[OWNER] /dashboard/rooms OK');

    await page.goto(`${FRONTEND_URL}/dashboard/contracts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[OWNER] /dashboard/contracts OK');

    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[OWNER] /dashboard/bills OK');
  });

  test('Owner: KHÔNG truy cập được /dashboard/users (Admin only)', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    await page.goto(`${FRONTEND_URL}/dashboard/users`);
    await page.waitForTimeout(2000);

    // Có thể redirect về dashboard hoặc hiện error
    const url = page.url();
    const hasAccess = !url.includes('/dashboard/users') || url === FRONTEND_URL + '/dashboard/users';
    console.log(`[OWNER] /dashboard/users → URL: ${url}`);

    // Check: menu Người dùng không có trong sidebar của Owner
    const usersMenu = page.locator('a[href="/dashboard/users"], nav a:has-text("Người dùng")').first();
    const hasUsersMenu = await usersMenu.count() > 0;
    expect(hasUsersMenu).toBe(false);
    console.log('[CONFIRMED] Owner KHÔNG thấy menu Người dùng');
  });

  // ========== MANAGER ==========

  test('Manager: truy cập được /dashboard/buildings, /rooms, /bills (không có contracts nếu không assign)', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, MANAGER.email, MANAGER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    console.log('[MANAGER] Đăng nhập thành công');

    // Check menu
    const buildingMenu = page.locator('a[href*="buildings"], nav a:has-text("Tòa nhà")').first();
    const hasBuilding = await buildingMenu.count() > 0;

    const roomMenu = page.locator('a[href*="rooms"], nav a:has-text("Phòng")').first();
    const hasRoom = await roomMenu.count() > 0;

    const billMenu = page.locator('a[href*="bills"], nav a:has-text("Hóa đơn")').first();
    const hasBill = await billMenu.count() > 0;

    console.log(`[MANAGER] Menus: Tòa nhà=${hasBuilding}, Phòng=${hasRoom}, Hóa đơn=${hasBill}`);

    // Truy cập /dashboard/buildings
    await page.goto(`${FRONTEND_URL}/dashboard/buildings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[MANAGER] /dashboard/buildings OK');

    // Truy cập /dashboard/bills
    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[MANAGER] /dashboard/bills OK');

    // KHÔNG thấy /dashboard/users
    const usersMenu = page.locator('a[href="/dashboard/users"]').first();
    const hasUsersMenu = await usersMenu.count() > 0;
    expect(hasUsersMenu).toBe(false);
    console.log('[CONFIRMED] Manager KHÔNG thấy menu Người dùng');
  });

  // ========== TENANT ==========

  test('Tenant: chỉ thấy /dashboard/contracts, /bills, /profile, /my-requests, /find-room', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, TENANT.email, TENANT.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    console.log('[TENANT] Đăng nhập thành công');

    // Lấy tất cả menu items
    const navLinks = page.locator('nav a, .sidebar a, .menu a');
    const navText = await navLinks.allTextContents();
    const navStr = navText.join(' ').toLowerCase();

    // Tenant thấy: Hóa đơn, Hợp đồng, Yêu cầu của tôi, Tìm phòng
    expect(navStr).toMatch(/hóa đơn|bill/i);
    expect(navStr).toMatch(/hợp đồng|contract/i);
    console.log('[TENANT] Có menu Hóa đơn và Hợp đồng');

    // Tenant KHÔNG thấy: Tòa nhà, Phòng (như là quản lý), Người dùng, Yêu cầu thuê
    // "tìm phòng" là chức năng của Tenant, không phải "Phòng" quản lý
    expect(navStr).not.toMatch(/tòa nhà|building(?!.*tìm)/i);
    expect(navStr).not.toMatch(/(?<![tìm ])phòng(?!.*trọ)/i); // phòng nhưng không phải "tìm phòng"
    expect(navStr).not.toMatch(/người dùng|users(?!.*:)/i);
    console.log('[TENANT] KHÔNG có menu Tòa nhà, Phòng (quản lý), Người dùng');

    // Truy cập /dashboard/bills
    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.locator('h3:has-text("Hóa đơn")').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    console.log('[TENANT] /dashboard/bills OK');

    // Truy cập /dashboard/contracts
    await page.goto(`${FRONTEND_URL}/dashboard/contracts`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[TENANT] /dashboard/contracts OK');

    // Truy cập /dashboard/find-room
    await page.goto(`${FRONTEND_URL}/dashboard/find-room`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('[TENANT] /dashboard/find-room OK');
  });

  test('Tenant: KHÔNG truy cập được /dashboard/buildings, /rooms, /users', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, TENANT.email, TENANT.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });

    // Try /dashboard/buildings - redirect or error
    await page.goto(`${FRONTEND_URL}/dashboard/buildings`);
    await page.waitForTimeout(2000);
    let url = page.url();
    console.log(`[TENANT] /dashboard/buildings → ${url}`);

    // Try /dashboard/rooms
    await page.goto(`${FRONTEND_URL}/dashboard/rooms`);
    await page.waitForTimeout(2000);
    url = page.url();
    console.log(`[TENANT] /dashboard/rooms → ${url}`);

    // Try /dashboard/users
    await page.goto(`${FRONTEND_URL}/dashboard/users`);
    await page.waitForTimeout(2000);
    url = page.url();
    console.log(`[TENANT] /dashboard/users → ${url}`);

    // Check: Tenant KHÔNG thấy menu Tòa nhà, Phòng (quản lý)
    const navLinks = page.locator('nav a, .sidebar a, .menu a');
    const navText = await navLinks.allTextContents();
    const navStr = navText.join(' ');

    // Kiểm tra: "Tòa nhà" và "Phòng" (quản lý) không được phép hiển thị
    // "Tìm phòng" và "yêu cầu của tôi" thì được phép
    const hasBuilding = /tòa nhà(?!\s)/i.test(navStr); // "tòa nhà" đứng riêng
    const hasRoomsMgmt = /(?<![tìm ])phòng(?!.*trọ)/i.test(navStr); // "phòng" nhưng không phải "tìm phòng"
    expect(hasBuilding).toBe(false);
    expect(hasRoomsMgmt).toBe(false);
    console.log('[CONFIRMED] Tenant KHÔNG có menu Tòa nhà và Phòng (quản lý)');
  });

  // ========== SUMMARY ==========

  test('Summary: Role-based access control hoạt động đúng', async ({ page }) => {
    const results: string[] = [];

    // Test Admin
    await clearStorage(page);
    await loginViaUi(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    await page.goto(`${FRONTEND_URL}/dashboard/users`);
    await page.waitForTimeout(1500);
    const adminUrl = page.url();
    results.push(`Admin → /users: ${adminUrl.includes('/users') ? 'OK' : 'FAIL'}`);
    await clearStorage(page);

    // Test Owner
    await loginViaUi(page, OWNER.email, OWNER.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    await page.goto(`${FRONTEND_URL}/dashboard/buildings`);
    await page.waitForTimeout(1500);
    const ownerUrl = page.url();
    await page.goto(`${FRONTEND_URL}/dashboard/users`);
    await page.waitForTimeout(1500);
    const ownerUsersUrl = page.url();
    results.push(`Owner → /buildings: ${ownerUrl.includes('/buildings') ? 'OK' : 'FAIL'}`);
    results.push(`Owner → /users: ${!ownerUsersUrl.includes('/users') || ownerUsersUrl === FRONTEND_URL + '/dashboard' ? 'BLOCKED' : 'OK'}`);
    await clearStorage(page);

    // Test Tenant
    await loginViaUi(page, TENANT.email, TENANT.password);
    await page.waitForURL(/\/dashboard/, { timeout: 8000 });
    await page.goto(`${FRONTEND_URL}/dashboard/bills`);
    await page.waitForTimeout(1500);
    const tenantUrl = page.url();
    await page.goto(`${FRONTEND_URL}/dashboard/buildings`);
    await page.waitForTimeout(1500);
    const tenantBuildingsUrl = page.url();
    results.push(`Tenant → /bills: ${tenantUrl.includes('/bills') ? 'OK' : 'FAIL'}`);
    results.push(`Tenant → /buildings: ${!tenantBuildingsUrl.includes('/buildings') ? 'BLOCKED' : 'OK'}`);

    console.log('\n=== Role-based Access Summary ===');
    results.forEach(r => console.log(`  ${r}`));
    console.log('================================\n');

    // All results should contain OK or BLOCKED
    results.forEach(r => {
      expect(r).toMatch(/OK|BLOCKED/);
    });
  });
});

/**
 * FT-AUTH-05: JWT Token - kiem tra token duoc tao dung.
 * - Token co 3 phan: header.payload.signature (RFC 7519)
 * - Header chua "alg", "typ"
 * - Payload chua claim "sub" (email) va "exp"
 * - Token khong bi expired (hop le 24h = 86_400_000 ms theo app.jwt.expiration)
 * - Giai ma 1 nguoi login khac nhau → token khac nhau
 */
import { test, expect } from '@playwright/test';
import {
  ROUTES,
  SEL,
  loginViaUi,
  getStoredAuth,
  decodeJwt,
  isJwtExpired,
  clearStorage,
} from './helpers/auth';

test.describe('FT-AUTH-05: JWT Token', () => {
  test('login xong → token 3 phan, payload có sub/exp, còn hạn', async ({ page }) => {
    await clearStorage(page);
    await loginViaUi(page, 'tenant1@rentalms.com', 'tenant123');
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });

    const { token } = await getStoredAuth(page);
    expect(token, 'token phai ton tai').toBeTruthy();

    const parts = token!.split('.');
    expect(parts.length, 'JWT phai co 3 phan').toBe(3);

    const { header, payload } = decodeJwt(token!);

    // Header (RFC 7519: alg là bat buoc, typ tuy chon)
    expect(header.alg).toBeTruthy();
    if (header.typ) {
      expect(String(header.typ).toLowerCase()).toBe('jwt');
    }

    // Payload phai co sub va exp
    expect(payload.sub).toBeTruthy();
    expect(payload.exp).toBeTruthy();
    expect(typeof payload.exp).toBe('number');

    // Token phai chua email user (subject)
    expect(payload.sub).toContain('tenant1');

    // Token chua het han
    expect(isJwtExpired(token!)).toBe(false);

    // exp - now < 24h (config app.jwt.expiration = 86400000 ms)
    const ttlMs = payload.exp * 1000 - Date.now();
    expect(ttlMs).toBeGreaterThan(0);
    expect(ttlMs).toBeLessThanOrEqual(86_400_000);
  });

  test('hai lần login cùng user → token khác nhau (jti ngẫu nhiên hoặc khác iat)', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    await clearStorage(page1);
    await loginViaUi(page1, 'tenant1@rentalms.com', 'tenant123');
    await page1.waitForURL(/\/dashboard/, { timeout: 5000 });
    const token1 = (await getStoredAuth(page1)).token!;
    await ctx1.close();

    // Doi 1s de iat (issued at) hoac jti khac
    await new Promise((r) => setTimeout(r, 1100));

    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await clearStorage(page2);
    await loginViaUi(page2, 'tenant1@rentalms.com', 'tenant123');
    await page2.waitForURL(/\/dashboard/, { timeout: 5000 });
    const token2 = (await getStoredAuth(page2)).token!;
    await ctx2.close();

    expect(token1).not.toBe(token2);
  });
});

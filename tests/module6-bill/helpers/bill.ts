/**
 * Bill-specific helpers for Module 6 tests.
 */
import type { Page } from '@playwright/test';
import { FRONTEND_URL, BACKEND_URL, OWNER, TENANT, loginAndGetToken } from './auth';

// ─── Selectors ───────────────────────────────────────────────────────────────
export const S = {
  // Bill card selectors
  billCard:       '.bill-card',
  billBadge:      '.badge',
  billAmount:     '.bill-amount, .amount',
  billDueDate:    '.bill-due-date, [class*="due"]',
  billPeriod:     '.bill-period',

  // Status badges
  badgeOrange:   '.badge-orange',
  badgeGreen:    '.badge-green',
  badgeRed:      '.badge-red',
  badgeBlue:     '.badge-blue',

  // Section
  sectionTitle:  '.section-title, .section-head h2, h2',
  billGrid:       '.bill-grid, [class*="bill"]',

  // Modals
  billDetailModal:   '.modal:visible, [class*="modal"]:visible',
  detailAmount:      '.modal:visible .bill-total, [class*="modal"]:visible .amount',

  // Buttons
  payBtn:         'button:has-text("Thanh toán"), button:has-text("TT"), button:has(i.fa-money-bill)',
  detailBtn:      'button:has(i.fa-eye), button:has-text("Chi tiết")',
  printBtn:       'button:has(i.fa-print), button:has-text("In"), button:has-text("Xuất")',
  confirmCashBtn: 'button:has(i.fa-check), button:has-text("Xác nhận")',
  resetBtn:       'button:has(i.fa-undo), button:has-text("Đặt lại")',

  // Pay modal
  payModal:       '.pay-modal, [class*="pay"]:visible',
  amountInput:    'input[type="number"], input[placeholder*="số tiền"], input[placeholder*="amount"]',
  methodSelect:   'select, [class*="method"], [class*="payment"] select',
  refInput:       'input[placeholder*="mã"], input[placeholder*="ref"], input[placeholder*="mã chuyển"]',

  // Empty state
  emptyState:     '.empty, [class*="empty"], .no-bills',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Check if bills exist on page, return count */
export async function getBillCount(page: Page): Promise<number> {
  const cards = page.locator(S.billCard);
  return await cards.count();
}

/** Get all bill statuses visible on page */
export async function getBillStatuses(page: Page): Promise<string[]> {
  const badges = page.locator(S.billBadge);
  const count = await badges.count();
  const statuses: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await badges.nth(i).textContent();
    if (text) statuses.push(text.trim());
  }
  return statuses;
}

/** Get bill cards by status */
export async function getBillCardsByStatus(page: Page, statusText: string): Promise<number> {
  const cards = page.locator(S.billCard).filter({ has: page.locator(S.billBadge).filter({ hasText: statusText }) });
  return await cards.count();
}

/** Navigate to bills page and wait for load */
export async function gotoBillsPage(page: Page, email?: string, password?: string): Promise<void> {
  if (email && password) {
    await loginAndGetToken(page, email, password);
  }
  await page.goto(`${FRONTEND_URL}/dashboard/bills`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
}

/** Create a bill via backend API for testing purposes */
export async function createBillViaApi(page: Page, contractId: number): Promise<{ id: number; status: number }> {
  const result = await page.evaluate(async (cid: number) => {
    const token = localStorage.getItem('token');
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const res = await fetch(`${BACKEND_URL}/api/bills/generate/${cid}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }, contractId);
  return result;
}

/** Get unpaid bills via API */
export async function getUnpaidBills(page: Page): Promise<any[]> {
  const result = await page.evaluate(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BACKEND_URL}/api/bills`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status !== 200) return [];
    const data = await res.json();
    return (data.data ?? data ?? []).filter((b: any) => b.status === 'UNPAID' || b.status === 'OVERDUE');
  });
  return result;
}

/**
 * Helper cho Module 5 - Contracts: UI selectors + API helpers.
 */
import type { Page, APIRequestContext } from '@playwright/test';
import { FRONTEND_URL, BACKEND_URL, ROUTES } from './auth';
export { FRONTEND_URL, BACKEND_URL, ROUTES };

// ============ Selectors dựa trên ContractsSection.tsx ============
export const SEL = {
  sectionHead: '.section-head',
  heading: '.section-head h3',
  // Table
  contractsTable: 'table',
  tableHead: 'thead tr',
  tableRow: 'tbody tr',
  empty: '.empty',
  loading: '.loading',
  // Badges
  badgeActive: '.badge-green',
  badgePending: '.badge-orange',
  badgeExtended: '.badge-blue',
  badgeTerminated: '.badge-red',
  badgeExpired: '.badge-gray',
  badge: '.badge',
  // Buttons trên row
  downloadBtn: 'button[title="Tải hợp đồng .docx"]',
  terminateBtn: 'button[title="Chấm dứt hợp đồng"]',
  // Cells
  cellRoom: 'tbody td:nth-child(1)',
  cellTenant: 'tbody td:nth-child(2)',
  cellStartDate: 'tbody td:nth-child(3)',
  cellEndDate: 'tbody td:nth-child(4)',
  cellPrice: 'tbody td:nth-child(5)',
  cellStatus: 'tbody td:nth-child(6)',
  cellActions: 'tbody td:nth-child(7)',
};

export async function gotoContractsPage(page: Page) {
  await page.goto(FRONTEND_URL + ROUTES.contracts);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('.nav-item', { timeout: 10000 });
  await page.waitForTimeout(1500);
}

// ============ API helpers ============

export interface ContractCreatePayload {
  roomId: number;
  tenantId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  deposit?: number;
  monthlyRent: number;
  rentCycle?: 'MONTHLY' | 'QUARTERLY';
  policy?: string;
  lateFeePercent?: number;
}

/**
 * Tạo contract qua API backend.
 * Yêu cầu: OWNER/ADMIN đã login, có token.
 */
export async function createContractViaApi(
  request: APIRequestContext,
  token: string,
  payload: ContractCreatePayload,
) {
  const res = await request.post(`${BACKEND_URL}/api/contracts`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      rentCycle: 'MONTHLY',
      lateFeePercent: 0.05,
      ...payload,
    },
  });
  return {
    status: res.status(),
    body: await res.json().catch(() => null),
  };
}

/**
 * Lấy danh sách phòng của OWNER (để test tạo contract cần roomId).
 */
export async function listMyRoomsViaApi(request: APIRequestContext, token: string) {
  // Lấy danh sách building trước
  const buildingsRes = await request.get(`${BACKEND_URL}/api/buildings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const buildingsBody = await buildingsRes.json().catch(() => null);
  const buildings = buildingsBody?.data ?? [];

  // Lấy rooms cho mỗi building
  const allRooms: any[] = [];
  for (const b of buildings) {
    const roomsRes = await request.get(`${BACKEND_URL}/api/buildings/${b.id}/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const roomsBody = await roomsRes.json().catch(() => null);
    const rooms = (roomsBody?.data ?? []).map((r: any) => ({ ...r, buildingName: b.name }));
    allRooms.push(...rooms);
  }
  return allRooms;
}

/**
 * Lấy danh sách tenant (USER có role TENANT) qua API admin/manager.
 */
export async function listTenantsViaApi(request: APIRequestContext, token: string) {
  // Thử gọi endpoint users nếu là ADMIN
  const res = await request.get(`${BACKEND_URL}/api/admin/users?role=TENANT`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status() === 200) {
    const body = await res.json().catch(() => null);
    return body?.data ?? [];
  }
  return [];
}

/**
 * Terminate contract qua API.
 */
export async function terminateContractViaApi(
  request: APIRequestContext,
  token: string,
  contractId: number,
) {
  const res = await request.put(`${BACKEND_URL}/api/contracts/${contractId}/terminate`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    status: res.status(),
    body: await res.json().catch(() => null),
  };
}

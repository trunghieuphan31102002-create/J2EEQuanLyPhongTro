import { apiClient } from './client';
import type { ApiResponse, UserRole } from '@/types/api';
import type { Profile } from '@/types/profile';
import type { AdminReportOverview, AuditFilterOptions, AuditLog, AuditLogPage } from '@/types/admin';

// ── Users ──────────────────────────────────────────────────
export async function listAllUsers(role?: UserRole | ''): Promise<Profile[]> {
  const { data } = await apiClient.get<ApiResponse<Profile[]>>('/admin/users', {
    params: role ? { role } : {},
  });
  return data.data ?? [];
}

export async function getUserById(id: number): Promise<Profile> {
  const { data } = await apiClient.get<ApiResponse<Profile>>(`/admin/users/${id}`);
  if (!data.data) throw new Error(data.message || 'Không tìm thấy user');
  return data.data;
}

export async function toggleUserActive(id: number): Promise<Profile> {
  const { data } = await apiClient.put<ApiResponse<Profile>>(`/admin/users/${id}/toggle-active`);
  if (!data.data) throw new Error(data.message || 'Cập nhật thất bại');
  return data.data;
}

export async function changeUserRole(id: number, role: UserRole): Promise<Profile> {
  const { data } = await apiClient.put<ApiResponse<Profile>>(`/admin/users/${id}/role`, { role });
  if (!data.data) throw new Error(data.message || 'Đổi role thất bại');
  return data.data;
}

// ── Reports ────────────────────────────────────────────────
export async function getOverviewReport(): Promise<AdminReportOverview> {
  const { data } = await apiClient.get<ApiResponse<AdminReportOverview>>('/admin/reports/overview');
  return (data.data ?? {}) as AdminReportOverview;
}

export async function getFullReport(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>('/admin/reports/full');
  return data.data ?? {};
}

// ── Audit logs ─────────────────────────────────────────────
export interface AuditLogQuery {
  page?: number;
  size?: number;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

export async function listAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogPage> {
  const { data } = await apiClient.get<ApiResponse<AuditLogPage | AuditLog[]>>('/admin/audit-logs', {
    params: { page: 0, size: 20, ...query },
  });
  // Backend may return either a Page<> or a flat List — normalize
  const raw = data.data;
  if (Array.isArray(raw)) {
    return {
      content: raw,
      totalElements: raw.length,
      totalPages: 1,
      number: 0,
      size: raw.length,
    };
  }
  return raw ?? { content: [], totalElements: 0, totalPages: 0, number: 0, size: 0 };
}

export async function getAuditFilters(): Promise<AuditFilterOptions> {
  const { data } = await apiClient.get<ApiResponse<AuditFilterOptions>>('/admin/audit-logs/filters');
  return data.data ?? { actions: [], entityTypes: [] };
}

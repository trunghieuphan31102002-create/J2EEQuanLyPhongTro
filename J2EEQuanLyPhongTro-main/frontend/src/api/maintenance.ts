import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { MaintenanceCreate, MaintenanceRequest, MaintenanceStatusUpdate } from '@/types/maintenance';

export async function listMyMaintenance(): Promise<MaintenanceRequest[]> {
  const { data } = await apiClient.get<ApiResponse<MaintenanceRequest[]>>('/maintenance/my');
  return data.data ?? [];
}

export async function listMaintenanceByBuilding(buildingId: number): Promise<MaintenanceRequest[]> {
  const { data } = await apiClient.get<ApiResponse<MaintenanceRequest[]>>(`/maintenance/building/${buildingId}`);
  return data.data ?? [];
}

export async function createMaintenance(payload: MaintenanceCreate): Promise<MaintenanceRequest> {
  const { data } = await apiClient.post<ApiResponse<MaintenanceRequest>>('/maintenance', payload);
  if (!data.data) throw new Error(data.message || 'Gửi yêu cầu thất bại');
  return data.data;
}

export async function updateMaintenanceStatus(
  id: number,
  payload: MaintenanceStatusUpdate,
): Promise<MaintenanceRequest> {
  const { data } = await apiClient.put<ApiResponse<MaintenanceRequest>>(`/maintenance/${id}/status`, payload);
  if (!data.data) throw new Error(data.message || 'Cập nhật thất bại');
  return data.data;
}

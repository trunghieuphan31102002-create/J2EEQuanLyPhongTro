import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { RentalRequest, RentalRequestCreate } from '@/types/rental';

export async function applyForRoom(payload: RentalRequestCreate): Promise<RentalRequest> {
  const { data } = await apiClient.post<ApiResponse<RentalRequest>>('/rental-requests', payload);
  if (!data.data) throw new Error(data.message || 'Gửi yêu cầu thất bại');
  return data.data;
}

export async function listRentalRequests(): Promise<RentalRequest[]> {
  const { data } = await apiClient.get<ApiResponse<RentalRequest[]>>('/rental-requests');
  return data.data ?? [];
}

export async function approveRequest(id: number): Promise<RentalRequest> {
  const { data } = await apiClient.put<ApiResponse<RentalRequest>>(`/rental-requests/${id}/approve`);
  if (!data.data) throw new Error(data.message || 'Duyệt thất bại');
  return data.data;
}

export async function rejectRequest(id: number): Promise<RentalRequest> {
  const { data } = await apiClient.put<ApiResponse<RentalRequest>>(`/rental-requests/${id}/reject`);
  if (!data.data) throw new Error(data.message || 'Từ chối thất bại');
  return data.data;
}

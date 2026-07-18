import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { Contract } from '@/types/rental';

export async function listMyContracts(): Promise<Contract[]> {
  const { data } = await apiClient.get<ApiResponse<Contract[]>>('/contracts');
  return data.data ?? [];
}

export async function getContract(id: number): Promise<Contract> {
  const { data } = await apiClient.get<ApiResponse<Contract>>(`/contracts/${id}`);
  if (!data.data) throw new Error(data.message || 'Không tìm thấy hợp đồng');
  return data.data;
}

export async function terminateContract(id: number): Promise<Contract> {
  const { data } = await apiClient.put<ApiResponse<Contract>>(`/contracts/${id}/terminate`);
  if (!data.data) throw new Error(data.message || 'Kết thúc thất bại');
  return data.data;
}

export async function renewContract(id: number, newEndDate: string): Promise<Contract> {
  const { data } = await apiClient.put<ApiResponse<Contract>>(`/contracts/${id}/renew`, { newEndDate });
  if (!data.data) throw new Error(data.message || 'Gia hạn thất bại');
  return data.data;
}

export function contractDownloadUrl(id: number): string {
  return `/api/contracts/${id}/download`;
}

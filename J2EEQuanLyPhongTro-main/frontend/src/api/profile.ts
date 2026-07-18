import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { Profile, ProfileUpdateRequest } from '@/types/profile';

export async function getMyProfile(): Promise<Profile> {
  const { data } = await apiClient.get<ApiResponse<Profile>>('/profile');
  if (!data.data) throw new Error(data.message || 'Không tải được hồ sơ');
  return data.data;
}

export async function updateProfile(payload: ProfileUpdateRequest): Promise<Profile> {
  const { data } = await apiClient.put<ApiResponse<Profile>>('/profile', payload);
  if (!data.data) throw new Error(data.message || 'Cập nhật thất bại');
  return data.data;
}

export async function getTenantProfile(userId: number): Promise<Profile> {
  const { data } = await apiClient.get<ApiResponse<Profile>>(`/profile/${userId}`);
  if (!data.data) throw new Error(data.message || 'Không tải được hồ sơ');
  return data.data;
}

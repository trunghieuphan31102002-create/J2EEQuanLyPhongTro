import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<ApiResponse<{ url: string }>>('/upload/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!data.data?.url) throw new Error(data.message || 'Upload thất bại');
  return data.data.url;
}

export async function uploadVideo(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<ApiResponse<{ url: string }>>('/upload/video', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!data.data?.url) throw new Error(data.message || 'Upload thất bại');
  return data.data.url;
}

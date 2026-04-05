import { apiClient } from './client';
import type { ApiResponse, AuthResponse, LoginRequest, RegisterRequest } from '@/types/api';

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', payload);
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Đăng nhập thất bại');
  }
  return data.data;
}

export async function register(payload: RegisterRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', payload);
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Đăng ký thất bại');
  }
  return data.data;
}

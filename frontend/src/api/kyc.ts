import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export interface KycResult {
  id: string;
  name: string;
  dob: string;
  sex: string;
  nationality: string;
  home: string;
  address: string;
  doe: string;
  issueDate: string;
  issueLoc: string;
  features: string;
  cccdFrontUrl: string;
  cccdBackUrl: string;
  verified: boolean;
}

export async function verifyCccd(front: File, back: File): Promise<KycResult> {
  const form = new FormData();
  form.append('front', front);
  form.append('back', back);
  const { data } = await apiClient.post<ApiResponse<KycResult>>('/kyc/verify', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!data.data) throw new Error(data.message || 'Xác thực CCCD thất bại');
  return data.data;
}

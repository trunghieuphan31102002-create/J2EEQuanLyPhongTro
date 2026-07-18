import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

/**
 * Tao URL thanh toan VNPay cho 1 hoa don.
 * Tra ve URL de frontend redirect sang trang VNPay sandbox.
 */
export async function createVnpayPayment(billId: number): Promise<string> {
  const { data } = await apiClient.post<ApiResponse<{ paymentUrl: string }>>(
    `/vnpay/create-payment/${billId}`,
  );
  if (!data.data?.paymentUrl) {
    throw new Error(data.message || 'Khong tao duoc URL thanh toan');
  }
  return data.data.paymentUrl;
}

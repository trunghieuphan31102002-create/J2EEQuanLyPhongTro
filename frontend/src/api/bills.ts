import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { AddItemRequest, Bill, PayRequest } from '@/types/bill';

export async function listMyBills(): Promise<Bill[]> {
  const { data } = await apiClient.get<ApiResponse<Bill[]>>('/bills');
  return data.data ?? [];
}

export async function listOwnerBills(): Promise<Bill[]> {
  const { data } = await apiClient.get<ApiResponse<Bill[]>>('/bills/owner-view');
  return data.data ?? [];
}

export async function listBillsByContract(contractId: number): Promise<Bill[]> {
  const { data } = await apiClient.get<ApiResponse<Bill[]>>(`/bills/contract/${contractId}`);
  return data.data ?? [];
}

export async function getBill(id: number): Promise<Bill> {
  const { data } = await apiClient.get<ApiResponse<Bill>>(`/bills/${id}`);
  if (!data.data) throw new Error(data.message || 'Không tìm thấy hóa đơn');
  return data.data;
}

export async function payBill(id: number, payload: PayRequest): Promise<unknown> {
  const { data } = await apiClient.post<ApiResponse<unknown>>(`/bills/${id}/pay`, payload);
  return data.data;
}

export async function confirmCashPayment(id: number): Promise<Bill> {
  const { data } = await apiClient.post<ApiResponse<Bill>>(`/bills/${id}/confirm-cash`);
  if (!data.data) throw new Error(data.message || 'Xác nhận thất bại');
  return data.data;
}

export async function resetBillToUnpaid(id: number): Promise<Bill> {
  const { data } = await apiClient.post<ApiResponse<Bill>>(`/bills/${id}/reset-unpaid`);
  if (!data.data) throw new Error(data.message || 'Reset thất bại');
  return data.data;
}

export async function addBillItem(id: number, payload: AddItemRequest): Promise<Bill> {
  const { data } = await apiClient.post<ApiResponse<Bill>>(`/bills/${id}/items`, payload);
  if (!data.data) throw new Error(data.message || 'Thêm khoản thất bại');
  return data.data;
}

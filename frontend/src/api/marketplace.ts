import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { MarketplaceBuilding, OwnerContactInfo, RoomListing } from '@/types/marketplace';

export interface RoomSearchParams {
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
}

export async function searchRooms(params: RoomSearchParams = {}): Promise<RoomListing[]> {
  const { data } = await apiClient.get<ApiResponse<RoomListing[]>>('/marketplace/rooms', { params });
  return data.data ?? [];
}

export async function searchBuildings(keyword = ''): Promise<MarketplaceBuilding[]> {
  const { data } = await apiClient.get<ApiResponse<MarketplaceBuilding[]>>('/marketplace', {
    params: { keyword },
  });
  return data.data ?? [];
}

export async function getBuildingRooms(buildingId: number): Promise<RoomListing[]> {
  const { data } = await apiClient.get<ApiResponse<RoomListing[]>>(
    `/marketplace/buildings/${buildingId}/rooms`,
  );
  return data.data ?? [];
}

export async function getOwnerInfo(buildingId: number): Promise<OwnerContactInfo> {
  const { data } = await apiClient.get<ApiResponse<OwnerContactInfo>>(
    `/marketplace/buildings/${buildingId}/owner`,
  );
  if (!data.data) throw new Error(data.message || 'Không tìm thấy thông tin chủ nhà');
  return data.data;
}

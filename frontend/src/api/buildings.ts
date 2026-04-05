import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { Building, BuildingCreate, BulkRoomRequest, ManagerOption, Room, RoomCreate } from '@/types/building';

export async function listMyBuildings(): Promise<Building[]> {
  const { data } = await apiClient.get<ApiResponse<Building[]>>('/buildings');
  return data.data ?? [];
}

export async function getBuilding(id: number): Promise<Building> {
  const { data } = await apiClient.get<ApiResponse<Building>>(`/buildings/${id}`);
  if (!data.data) throw new Error(data.message || 'Không tìm thấy tòa nhà');
  return data.data;
}

export async function createBuilding(payload: BuildingCreate): Promise<Building> {
  const { data } = await apiClient.post<ApiResponse<Building>>('/buildings', payload);
  if (!data.data) throw new Error(data.message || 'Tạo thất bại');
  return data.data;
}

export async function updateBuildingShape(id: number, geoJson: string): Promise<Building> {
  const { data } = await apiClient.put<ApiResponse<Building>>(`/buildings/${id}/shape`, { geoJson });
  if (!data.data) throw new Error(data.message || 'Cập nhật thất bại');
  return data.data;
}

export async function publishBuilding(id: number, status: 'PUBLIC' | 'PRIVATE'): Promise<Building> {
  const { data } = await apiClient.put<ApiResponse<Building>>(`/buildings/${id}/publish`, { status });
  if (!data.data) throw new Error(data.message || 'Cập nhật thất bại');
  return data.data;
}

// === MANAGER ASSIGNMENT ===

export async function listAvailableManagers(): Promise<ManagerOption[]> {
  const { data } = await apiClient.get<ApiResponse<ManagerOption[]>>('/buildings/available-managers');
  return data.data ?? [];
}

export async function assignBuildingManager(
  buildingId: number,
  managerId: number | null,
): Promise<Building> {
  const { data } = await apiClient.put<ApiResponse<Building>>(
    `/buildings/${buildingId}/assign-manager`,
    { managerId },
  );
  if (!data.data) throw new Error(data.message || 'Cập nhật thất bại');
  return data.data;
}

// === ROOMS ===

export async function listRoomsInBuilding(buildingId: number): Promise<Room[]> {
  const { data } = await apiClient.get<ApiResponse<Room[]>>(`/buildings/${buildingId}/rooms`);
  return data.data ?? [];
}

export async function createRoomInBuilding(buildingId: number, payload: RoomCreate): Promise<Room> {
  const { data } = await apiClient.post<ApiResponse<Room>>(`/buildings/${buildingId}/rooms`, payload);
  if (!data.data) throw new Error(data.message || 'Tạo phòng thất bại');
  return data.data;
}

export async function bulkCreateRooms(buildingId: number, payload: BulkRoomRequest): Promise<Room[]> {
  const { data } = await apiClient.post<ApiResponse<Room[]>>(`/buildings/${buildingId}/rooms/bulk`, payload);
  return data.data ?? [];
}

export async function updateRoomMedia(
  buildingId: number,
  roomId: number,
  imageUrl: string | null,
  videoUrl: string | null,
): Promise<Room> {
  const { data } = await apiClient.put<ApiResponse<Room>>(
    `/buildings/${buildingId}/rooms/${roomId}/media`,
    { imageUrl, videoUrl },
  );
  if (!data.data) throw new Error(data.message || 'Cập nhật media thất bại');
  return data.data;
}

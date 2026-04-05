export type PublishStatus = 'PUBLIC' | 'PRIVATE' | string;

export interface AssignedManager {
  id: number;
  fullName: string;
  email: string;
}

export interface Building {
  id: number;
  name: string;
  address: string;
  description: string | null;
  shapeGeoJson: string | null;
  publishStatus: PublishStatus;
  ownerId?: number;
  ownerName?: string | null;
  assignedManager?: AssignedManager | null;
  totalRooms?: number;
  availableRooms?: number;
  createdAt?: string | null;
}

export interface ManagerOption {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
}

export interface BuildingCreate {
  name: string;
  address: string;
  description?: string;
  shapeGeoJson?: string;
  publishStatus?: PublishStatus;
}

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | string;

export interface Room {
  id: number;
  roomNo: string;
  price: number;
  area: number | null;
  beds: number | null;
  amenities: string | null;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  status: RoomStatus;
  buildingId?: number;
  createdAt?: string | null;
}

export interface RoomCreate {
  roomNo: string;
  price: number;
  area?: number;
  beds?: number;
  amenities?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface BulkRoomRequest {
  pattern: string;   // e.g. "A-{i}"
  count: number;
  startIndex?: number;
  price: number;
  area?: number;
  beds?: number;
  amenities?: string;
  description?: string;
}

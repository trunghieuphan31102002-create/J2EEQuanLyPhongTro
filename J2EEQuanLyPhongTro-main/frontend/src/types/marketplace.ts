export interface RoomListing {
  id: number;
  roomNo: string | null;
  price: number;
  area: number | null;
  beds: number | null;
  amenities: string | null;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | string;
  buildingId: number;
  buildingName: string | null;
  buildingAddress: string | null;
  buildingDescription: string | null;
  buildingShapeGeoJson: string | null;
  createdAt: string | null;
}

export interface MarketplaceBuilding {
  id: number;
  name: string;
  address: string | null;
  description: string | null;
  publishStatus: 'PUBLIC' | 'PRIVATE' | string;
  thumbnailUrl?: string | null;
  createdAt?: string | null;
}

export interface OwnerContactInfo {
  fullName: string;
  phone: string | null;
  email: string;
  avatarUrl: string | null;
  zaloLink: string | null;
  buildingName: string;
  buildingAddress: string | null;
}

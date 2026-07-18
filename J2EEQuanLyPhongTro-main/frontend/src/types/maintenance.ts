export type MaintStatus = 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | string;
export type MaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;

export interface MaintenanceRequest {
  id: number;
  description: string;
  status: MaintStatus;
  priority: MaintPriority;
  imageUrl: string | null;
  note: string | null;
  cost: number | null;
  createdAt: string;
  resolvedAt: string | null;
  roomId?: number;
  roomNo?: string | null;
  buildingName?: string | null;
  tenantName?: string | null;
}

export interface MaintenanceCreate {
  roomId?: number;         // optional — backend infers from active contract if missing
  description: string;
  priority?: MaintPriority;
  imageUrl?: string;
}

export interface MaintenanceStatusUpdate {
  status: MaintStatus;
  note?: string;
  cost?: number;
}

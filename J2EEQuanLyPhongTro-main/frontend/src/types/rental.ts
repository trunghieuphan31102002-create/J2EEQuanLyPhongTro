export interface RentalRequestCreate {
  roomId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  note?: string;
}

export type RentalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;

export interface RentalRequest {
  id: number;
  roomId: number;
  roomNo: string | null;
  buildingName: string | null;
  tenantId: number;
  tenantName: string | null;
  tenantEmail: string | null;
  startDate: string;
  endDate: string;
  note: string | null;
  status: RentalRequestStatus;
  monthlyRent: number | null;
  createdAt: string;
}

export type ContractStatus = 'ACTIVE' | 'EXTENDED' | 'TERMINATED' | 'EXPIRED' | 'PENDING' | string;

export interface Contract {
  id: number;
  roomId: number;
  roomNo: string | null;
  buildingName: string | null;
  tenantId: number;
  tenantName: string | null;
  tenantEmail: string | null;
  startDate: string;
  endDate: string;
  deposit: number | null;
  monthlyRent: number | null;
  status: ContractStatus;
  createdAt: string | null;
}

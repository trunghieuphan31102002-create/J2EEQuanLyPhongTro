export type BillStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PENDING_CONFIRMATION' | string;

export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'WALLET' | 'POINT';

export interface BillItem {
  id: number;
  itemType: string;       // RENT, ELECTRICITY, WATER, SERVICE, PARKING, INTERNET, ...
  description: string | null;
  amount: number;
}

export interface Bill {
  id: number;
  contractId: number;
  tenantName: string | null;
  roomNo: string | null;
  buildingName: string | null;
  period: string;           // YYYY-MM
  totalAmount: number;
  paidAmount: number;
  lateFee: number | null;
  dueDate: string | null;
  status: BillStatus;
  items?: BillItem[];
}

export interface PayRequest {
  amount: number;
  method?: PaymentMethod;
  referenceCode?: string;
  note?: string;
}

export interface AddItemRequest {
  itemType: string;
  description?: string;
  amount: number;
}

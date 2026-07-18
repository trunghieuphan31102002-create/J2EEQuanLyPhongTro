export type BillStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PENDING_CONFIRMATION' | string;

export type PaymentMethod = 'BANK_TRANSFER' | 'CASH';

export interface BillItem {
  id: number;
  itemType: string;       // RENT, ELECTRICITY, WATER, SERVICE, PARKING, INTERNET, ...
  description: string | null;
  amount: number;
  previousReading?: number | null;
  currentReading?: number | null;
  unitPrice?: number | null;
}

export interface Payment {
  id: number;
  amount: number;
  method: string;          // CASH, BANK_TRANSFER, VNPAY
  status: string;          // PENDING, SUCCESS, FAILED
  referenceCode: string | null;
  note: string | null;
  proofImageUrl: string | null;
  paidAt: string | null;
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
  payments?: Payment[];
}

export interface PayRequest {
  amount: number;
  method?: PaymentMethod;
  referenceCode?: string;
  note?: string;
  proofImageUrl?: string;
}

export interface AddItemRequest {
  itemType: string;
  description?: string;
  amount: number;
}

export type NotificationType =
  | 'BILL_ISSUED'
  | 'BILL_DUE_SOON'
  | 'BILL_OVERDUE'
  | 'BILL_PAID'
  | 'MAINTENANCE_SUBMITTED'
  | 'MAINTENANCE_STATUS_UPDATED'
  | 'RENTAL_REQUEST_SUBMITTED'
  | 'RENTAL_REQUEST_APPROVED'
  | 'RENTAL_REQUEST_REJECTED'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'BUG_REPORT'
  | string;

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  createdAt: string;
}

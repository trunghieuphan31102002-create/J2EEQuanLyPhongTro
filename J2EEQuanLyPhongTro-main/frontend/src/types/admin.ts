export interface AuditLog {
  id: number;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  description: string | null;
  createdAt: string;
}

export interface AuditLogPage {
  content: AuditLog[];
  totalElements: number;
  totalPages: number;
  number: number; // current page
  size: number;
}

export interface AuditFilterOptions {
  actions: string[];
  entityTypes: string[];
}

export interface AdminReportOverview {
  totalUsers: number;
  activeUsers: number;
  totalBuildings: number;
  totalRooms: number;
  totalContracts: number;
  totalBills: number;
  totalRevenue: number;
  pendingBugReports?: number;
  [key: string]: unknown;
}

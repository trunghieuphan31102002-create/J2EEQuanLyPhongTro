import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { AppNotification } from '@/types/notification';

export async function listNotifications(): Promise<AppNotification[]> {
  const { data } = await apiClient.get<ApiResponse<AppNotification[]>>('/notifications');
  return data.data ?? [];
}

export async function countUnread(): Promise<number> {
  const { data } = await apiClient.get<ApiResponse<number>>('/notifications/unread-count');
  return data.data ?? 0;
}

export async function markAsRead(id: number): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}

export async function sendSystemAnnouncement(title: string, message: string): Promise<void> {
  await apiClient.post('/notifications/system-announcement', { title, message });
}

export async function submitBugReport(title: string, message: string): Promise<void> {
  await apiClient.post('/notifications/bug-report', { title, message });
}

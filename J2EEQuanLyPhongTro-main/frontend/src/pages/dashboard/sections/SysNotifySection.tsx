import { useEffect, useState, type FormEvent } from 'react';
import { sendSystemAnnouncement } from '@/api/notifications';
import { apiClient, getErrorMessage } from '@/api/client';
import { useToast } from '@/components/Toast';
import { timeAgo } from '@/lib/format';
import type { ApiResponse } from '@/types/api';

interface BugReport {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  recipientName?: string;
  recipientEmail?: string;
}

interface SysAnnouncement {
  id: number;
  title: string;
  message: string;
  createdAt: string;
}

export default function SysNotifySection() {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [history, setHistory] = useState<SysAnnouncement[]>([]);
  const [loadingBugs, setLoadingBugs] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadAll = async () => {
    setLoadingBugs(true);
    setLoadingHistory(true);
    try {
      const [bugsRes, historyRes] = await Promise.all([
        apiClient.get<ApiResponse<BugReport[]>>('/notifications/bug-reports'),
        apiClient.get<ApiResponse<SysAnnouncement[]>>('/notifications/system-announcements'),
      ]);
      setBugs(bugsRes.data.data ?? []);
      setHistory(historyRes.data.data ?? []);
    } catch {
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoadingBugs(false);
      setLoadingHistory(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }
    setSending(true);
    try {
      await sendSystemAnnouncement(title, message);
      toast.success('Đã gửi thông báo tới tất cả người dùng!');
      setTitle('');
      setMessage('');
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const markBugRead = async (id: number) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setBugs((prev) => prev.map((b) => (b.id === id ? { ...b, read: true } : b)));
    } catch {
      toast.error('Lỗi đánh dấu đã đọc');
    }
  };

  const unreadBugs = bugs.filter((b) => !b.read).length;

  return (
    <>
      <div className="section-card">
        <div className="section-head">
          <h3><i className="fa-solid fa-bullhorn" style={{ color: 'var(--primary)' }} /> Gửi thông báo hệ thống</h3>
        </div>
        <form onSubmit={submit} style={{ padding: '0 22px 20px' }}>
          <div style={{ display: 'grid', gap: 12, maxWidth: 600 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', marginBottom: 4, display: 'block' }}>Tiêu đề</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Bảo trì hệ thống ngày 05/04..."
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: "'Nunito',sans-serif" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', marginBottom: 4, display: 'block' }}>Nội dung thông báo</label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nội dung chi tiết thông báo tới toàn bộ người dùng..."
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: "'Nunito',sans-serif", resize: 'vertical' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }} disabled={sending}>
              {sending ? (<><i className="fa-solid fa-spinner fa-spin" /> Đang gửi...</>) : (<><i className="fa-solid fa-paper-plane" /> Gửi thông báo tới tất cả người dùng</>)}
            </button>
          </div>
        </form>
      </div>

      {/* Bug reports */}
      <div className="section-card" style={{ marginTop: 20 }}>
        <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3><i className="fa-solid fa-bug" style={{ color: 'var(--danger)' }} /> Báo lỗi từ người dùng</h3>
          {unreadBugs > 0 && <span className="badge badge-red">{unreadBugs}</span>}
        </div>
        {loadingBugs ? (
          <div className="loading"><span className="spinner" /> Đang tải...</div>
        ) : bugs.length === 0 ? (
          <div className="empty"><div className="empty-icon">🎉</div><p>Chưa có báo lỗi nào</p></div>
        ) : (
          <div style={{ padding: '0 22px 20px' }}>
            {bugs.map((b) => (
              <div
                key={b.id}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  marginBottom: 8,
                  background: b.read ? '#fff' : '#fff8f4',
                  borderLeft: b.read ? '1px solid var(--border)' : '4px solid var(--primary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                  <strong style={{ fontSize: 14 }}>{b.title}</strong>
                  {!b.read && (
                    <button
                      onClick={() => markBugRead(b.id)}
                      style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-light)', whiteSpace: 'pre-wrap', marginBottom: 6 }}>
                  {b.message}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {b.recipientName && <><i className="fa-solid fa-user" /> {b.recipientName} • </>}
                  {timeAgo(b.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="section-card" style={{ marginTop: 20 }}>
        <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3><i className="fa-solid fa-clock-rotate-left" style={{ color: '#3b82f6' }} /> Lịch sử thông báo đã gửi</h3>
          <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{history.length} thông báo</span>
        </div>
        {loadingHistory ? (
          <div className="loading"><span className="spinner" /> Đang tải...</div>
        ) : history.length === 0 ? (
          <div className="empty"><div className="empty-icon">📭</div><p>Chưa gửi thông báo nào</p></div>
        ) : (
          <div style={{ padding: '0 22px 20px' }}>
            {history.map((h) => (
              <div key={h.id} style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>{h.title}</strong>
                <div style={{ fontSize: 12, color: 'var(--text-light)', whiteSpace: 'pre-wrap', marginTop: 4 }}>{h.message}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{timeAgo(h.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import { getAuditFilters, listAuditLogs } from '@/api/admin';
import { useToast } from '@/components/Toast';
import type { AuditLog, AuditLogPage, AuditFilterOptions } from '@/types/admin';

const ACTION_LABELS: Record<string, string> = {
  REGISTER: 'Đăng ký', LOGIN: 'Đăng nhập', CREATE: 'Tạo mới', UPDATE: 'Cập nhật',
  DELETE: 'Xoá', PAYMENT: 'Thanh toán', LOCK_USER: 'Khoá TK', UNLOCK_USER: 'Mở khoá',
  CHANGE_ROLE: 'Đổi role', CONFIRM_CASH: 'Xác nhận TT', UPDATE_PROFILE: 'Cập nhật hồ sơ',
};

export default function AuditLogsSection() {
  const toast = useToast();
  const [page, setPage] = useState<AuditLogPage>({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditFilterOptions>({ actions: [], entityTypes: [] });
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    getAuditFilters().then(setFilters).catch(() => { /* optional */ });
  }, []);

  useEffect(() => {
    setLoading(true);
    listAuditLogs({
      page: currentPage,
      size: 20,
      action: action || undefined,
      entityType: entityType || undefined,
      from: from || undefined,
      to: to || undefined,
    })
      .then(setPage)
      .catch(() => toast.error('Không tải được audit logs'))
      .finally(() => setLoading(false));
  }, [currentPage, action, entityType, from, to, toast]);

  const inputStyle = { padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, background: '#fff' } as const;

  return (
    <div className="section-card">
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h3><i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--primary)' }} /> Nhật ký hoạt động</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={action} onChange={(e) => { setAction(e.target.value); setCurrentPage(0); }} style={inputStyle}>
            <option value="">Tất cả hành động</option>
            {filters.actions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
          </select>
          <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setCurrentPage(0); }} style={inputStyle}>
            <option value="">Tất cả đối tượng</option>
            {filters.entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setCurrentPage(0); }} title="Từ ngày" style={inputStyle} />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setCurrentPage(0); }} title="Đến ngày" style={inputStyle} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Thời gian</th>
              <th>Người thực hiện</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>ID</th>
              <th>Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading"><span className="spinner" /></td></tr>
            ) : page.content.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty"><div className="empty-icon">📜</div><p>Chưa có log nào</p></div>
                </td>
              </tr>
            ) : (
              page.content.map((log: AuditLog, idx) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-light)', fontSize: 12 }}>{currentPage * 20 + idx + 1}</td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '-'}</td>
                  <td style={{ fontSize: 12 }}>{log.actorEmail || 'System'}</td>
                  <td>
                    <span className="badge badge-blue">{ACTION_LABELS[log.action] || log.action}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{log.entityType || '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{log.entityId ?? '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-light)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.description || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {page.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 22px', fontSize: 13 }}>
          <div style={{ color: 'var(--text-light)' }}>
            Trang {currentPage + 1} / {page.totalPages} • Tổng {page.totalElements} bản ghi
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm btn-outline"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            >
              <i className="fa-solid fa-chevron-left" /> Trước
            </button>
            <button
              className="btn btn-sm btn-outline"
              disabled={currentPage >= page.totalPages - 1}
              onClick={() => setCurrentPage(Math.min(page.totalPages - 1, currentPage + 1))}
            >
              Sau <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

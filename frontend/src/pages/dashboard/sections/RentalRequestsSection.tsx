import { useEffect, useMemo, useState } from 'react';
import { approveRequest, listRentalRequests, rejectRequest } from '@/api/rentalRequests';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/api/client';
import { fmtDate, fmtNumber } from '@/lib/format';
import type { RentalRequest } from '@/types/rental';

const STATUS_LABEL: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
const STATUS_BADGE: Record<string, string> = { PENDING: 'badge-orange', APPROVED: 'badge-green', REJECTED: 'badge-red' };

export default function RentalRequestsSection() {
  const toast = useToast();
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    listRentalRequests()
      .then(setRequests)
      .catch(() => toast.error('Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'PENDING').length, [requests]);

  const handleApprove = async (id: number) => {
    if (!confirm('Duyệt yêu cầu thuê này? Hợp đồng sẽ được tạo tự động.')) return;
    try {
      await approveRequest(id);
      toast.success('Đã duyệt yêu cầu. Hợp đồng đã được tạo.');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Từ chối yêu cầu này?')) return;
    try {
      await rejectRequest(id);
      toast.success('Đã từ chối yêu cầu');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="section-card">
      <div className="section-head">
        <h3><i className="fa-solid fa-inbox" style={{ color: 'var(--primary)' }} /> Yêu cầu thuê phòng</h3>
        {pendingCount > 0 && <span className="badge badge-orange">{pendingCount} chờ duyệt</span>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Phòng</th>
              <th>Tòa nhà</th>
              <th>Người thuê</th>
              <th>Từ ngày</th>
              <th>Đến ngày</th>
              <th>Giá thuê</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="loading"><span className="spinner" /></td></tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty">
                    <div className="empty-icon">📭</div>
                    <p>Chưa có yêu cầu thuê nào</p>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td><b>Phòng {r.roomNo || r.roomId}</b></td>
                  <td>{r.buildingName || '-'}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.tenantName || '-'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{r.tenantEmail || ''}</div>
                  </td>
                  <td>{fmtDate(r.startDate)}</td>
                  <td>{fmtDate(r.endDate)}</td>
                  <td><b>{fmtNumber(r.monthlyRent ?? 0)}đ</b></td>
                  <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.status === 'PENDING' && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => handleApprove(r.id)} title="Duyệt">
                          <i className="fa-solid fa-check" /> Duyệt
                        </button>{' '}
                        <button className="btn btn-sm btn-danger" onClick={() => handleReject(r.id)} title="Từ chối">
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

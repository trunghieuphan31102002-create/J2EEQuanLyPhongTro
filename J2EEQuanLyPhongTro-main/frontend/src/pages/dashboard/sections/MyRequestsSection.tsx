import { useEffect, useState } from 'react';
import { listRentalRequests } from '@/api/rentalRequests';
import { useToast } from '@/components/Toast';
import { fmtDate, fmtNumber } from '@/lib/format';
import type { RentalRequest } from '@/types/rental';

const STATUS_LABEL: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
const STATUS_BADGE: Record<string, string> = { PENDING: 'badge-orange', APPROVED: 'badge-green', REJECTED: 'badge-red' };

export default function MyRequestsSection() {
  const toast = useToast();
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listRentalRequests()
      .then(setRequests)
      .catch(() => toast.error('Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  }, [toast]);

  return (
    <div className="section-card">
      <div className="section-head">
        <h3><i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--primary)' }} /> Yêu cầu thuê của tôi</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Phòng</th>
              <th>Tòa nhà</th>
              <th>Từ ngày</th>
              <th>Đến ngày</th>
              <th>Giá thuê</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading"><span className="spinner" /></td></tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <div className="empty-icon">📋</div>
                    <p>Bạn chưa có yêu cầu thuê nào. Hãy vào <b>Tìm phòng</b> để đăng ký!</p>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td><b>Phòng {r.roomNo || r.roomId}</b></td>
                  <td>{r.buildingName || '-'}</td>
                  <td>{fmtDate(r.startDate)}</td>
                  <td>{fmtDate(r.endDate)}</td>
                  <td><b>{fmtNumber(r.monthlyRent ?? 0)}đ</b></td>
                  <td><span className={`badge ${STATUS_BADGE[r.status] || 'badge-gray'}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                  <td style={{ maxWidth: 200, fontSize: 12, color: 'var(--text-light)' }}>{r.note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { contractDownloadUrl, listMyContracts, terminateContract } from '@/api/contracts';
import { useToast } from '@/components/Toast';
import { apiClient, getErrorMessage } from '@/api/client';
import { fmtDate, fmtNumber } from '@/lib/format';
import type { Contract } from '@/types/rental';

const BADGE: Record<string, { cls: string; label: string }> = {
  PENDING:    { cls: 'badge-orange', label: 'Chờ duyệt' },
  ACTIVE:     { cls: 'badge-green',  label: 'Hiệu lực' },
  EXTENDED:   { cls: 'badge-blue',   label: 'Gia hạn' },
  TERMINATED: { cls: 'badge-red',    label: 'Kết thúc' },
  EXPIRED:    { cls: 'badge-gray',   label: 'Hết hạn' },
};

export default function ContractsSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // MANAGER chi duoc xem hop dong (khong tao/cham dut) theo nghiep vu
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const refresh = () => {
    setLoading(true);
    listMyContracts()
      .then(setContracts)
      .catch(() => toast.error('Lỗi tải hợp đồng'))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTerminate = async (id: number) => {
    if (!confirm('Chấm dứt hợp đồng này? Hành động không thể hoàn tác.')) return;
    try {
      await terminateContract(id);
      toast.success('Đã chấm dứt hợp đồng');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const res = await apiClient.get(contractDownloadUrl(id).replace('/api', ''), { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HopDong-${id}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Lỗi tải hợp đồng');
    }
  };

  return (
    <div className="section-card">
      <div className="section-head">
        <h3><i className="fa-solid fa-file-contract" style={{ color: 'var(--primary)' }} /> Hợp đồng</h3>
        {/* Hợp đồng được tự động tạo khi Owner duyệt yêu cầu thuê phòng */}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Phòng</th>
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
              <tr><td colSpan={7} className="loading"><span className="spinner" /> Đang tải...</td></tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <div className="empty-icon">📋</div>
                    <p>Chưa có hợp đồng nào</p>
                  </div>
                </td>
              </tr>
            ) : (
              contracts.map((c) => {
                const badge = BADGE[c.status] ?? { cls: 'badge-gray', label: c.status };
                return (
                  <tr key={c.id}>
                    <td>
                      <b>Phòng {c.roomNo || c.roomId}</b>
                      {c.buildingName && <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{c.buildingName}</div>}
                    </td>
                    <td>{c.tenantName || '-'}</td>
                    <td>{fmtDate(c.startDate)}</td>
                    <td>{fmtDate(c.endDate)}</td>
                    <td><strong>{fmtNumber(c.monthlyRent ?? 0)}đ</strong></td>
                    <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline"
                        style={{ color: '#3b82f6' }}
                        onClick={() => handleDownload(c.id)}
                        title="Tải hợp đồng .docx"
                      >
                        <i className="fa-solid fa-file-word" />
                      </button>
                      {canManage && c.status === 'ACTIVE' && (
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ marginLeft: 4 }}
                          onClick={() => handleTerminate(c.id)}
                          title="Chấm dứt hợp đồng"
                        >
                          <i className="fa-solid fa-ban" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

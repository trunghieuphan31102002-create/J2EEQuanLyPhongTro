import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { confirmCashPayment, getBill, listMyBills, listOwnerBills, payBill, resetBillToUnpaid } from '@/api/bills';
import { createVnpayPayment } from '@/api/vnpay';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/api/client';
import { fmtDate, fmtNumber } from '@/lib/format';
import type { Bill, PaymentMethod } from '@/types/bill';

const STATUS_MAP: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PARTIAL: 'Trả một phần',
  PAID: 'Đã thanh toán',
  OVERDUE: 'Quá hạn',
  CANCELLED: 'Hủy',
  PENDING_CONFIRMATION: 'Chờ xác nhận',
};

function billBadge(status: string) {
  const map: Record<string, { cls: string; label: string }> = {
    UNPAID:               { cls: 'badge-orange', label: 'Chưa TT' },
    PARTIAL:              { cls: 'badge-blue',   label: 'Trả 1 phần' },
    PAID:                 { cls: 'badge-green',  label: 'Đã trả' },
    OVERDUE:              { cls: 'badge-red',    label: 'Quá hạn' },
    PENDING_CONFIRMATION: { cls: 'badge-blue',   label: 'Chờ xác nhận' },
  };
  const b = map[status] ?? { cls: 'badge-gray', label: status };
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}

export default function BillsSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payBillId, setPayBillId] = useState<number | null>(null);

  const isTenant = user?.role === 'TENANT';
  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const refresh = () => {
    setLoading(true);
    const fetcher = isTenant ? listMyBills() : listOwnerBills();
    fetcher
      .then(setBills)
      .catch(() => toast.error('Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetailBill({ id } as Bill);
    try {
      setDetailBill(await getBill(id));
    } catch {
      toast.error('Không tải được chi tiết');
      setDetailBill(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirmCash = async (id: number) => {
    if (!confirm('Xác nhận đã nhận tiền mặt và đánh dấu hóa đơn là Đã thanh toán?')) return;
    try {
      await confirmCashPayment(id);
      toast.success('Đã xác nhận thanh toán tiền mặt!');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleVnpay = async (id: number) => {
    try {
      const url = await createVnpayPayment(id);
      // Redirect toan bo tab sang VNPay
      window.location.href = url;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không tạo được giao dịch VNPay'));
    }
  };

  const handleReset = async (id: number) => {
    if (!confirm('Reset hóa đơn về Chưa thanh toán và gửi thông báo nhắc nhở?')) return;
    try {
      await resetBillToUnpaid(id);
      toast.success('Đã reset hóa đơn và gửi nhắc nhở!');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <div className="section-head" style={{ padding: '0 0 16px' }}>
        <h3><i className="fa-solid fa-file-invoice-dollar" style={{ color: 'var(--primary)' }} /> {isTenant ? 'Hóa đơn của tôi' : 'Hóa đơn'}</h3>
      </div>

      {loading ? (
        <div className="loading"><span className="spinner" /> Đang tải...</div>
      ) : bills.length === 0 ? (
        <div className="empty"><div className="empty-icon">💸</div><p>Chưa có hóa đơn nào</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {bills.map((b) => (
            <div key={b.id} className="bill-card">
              <div className="bill-head">
                <div>
                  <div className="bill-period">Kỳ {b.period || fmtDate(b.dueDate)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>Hạn: {fmtDate(b.dueDate)}</div>
                  {!isTenant && b.roomNo && (
                    <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      Phòng: {b.roomNo} • {b.tenantName ?? ''}
                    </div>
                  )}
                </div>
                {billBadge(b.status)}
              </div>
              <div className="bill-amount">{fmtNumber(b.totalAmount)}đ</div>
              {b.paidAmount > 0 && (
                <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                  Đã thanh toán: {fmtNumber(b.paidAmount)}đ
                </div>
              )}
              {b.status === 'PENDING_CONFIRMATION' && isTenant && (
                <div style={{ fontSize: 12, color: '#b45309', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, padding: '6px 10px', marginTop: 6 }}>
                  <i className="fa-solid fa-clock" /> Đang chờ chủ nhà xác nhận tiền mặt
                </div>
              )}
              <div className="bill-footer">
                <button className="btn btn-sm btn-outline" onClick={() => openDetail(b.id)}>
                  <i className="fa-solid fa-eye" /> Chi tiết
                </button>
                {(b.status === 'UNPAID' || b.status === 'PARTIAL') && isTenant && (
                  <>
                    <button
                      className="btn btn-sm"
                      style={{ background: '#0068ff', color: 'white', border: 'none' }}
                      onClick={() => handleVnpay(b.id)}
                      title="Thanh toán online qua VNPay"
                    >
                      <i className="fa-solid fa-bolt" /> VNPay
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => setPayBillId(b.id)}>
                      <i className="fa-solid fa-credit-card" /> Khai báo TT
                    </button>
                  </>
                )}
                {isManager && b.status === 'PENDING_CONFIRMATION' && (
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ background: '#16a34a' }}
                    onClick={() => handleConfirmCash(b.id)}
                  >
                    <i className="fa-solid fa-circle-check" /> Xác nhận đã nhận tiền
                  </button>
                )}
                {isManager && b.status === 'PAID' && (
                  <button className="btn btn-sm btn-outline" onClick={() => handleReset(b.id)} title="Reset & nhắc">
                    <i className="fa-solid fa-rotate-left" /> Reset & Nhắc
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <div className={`modal-overlay${detailBill ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setDetailBill(null); }}>
        <div className="modal" style={{ maxWidth: 600, padding: 0 }}>
          {detailLoading || !detailBill ? (
            <div className="empty" style={{ padding: 40 }}><span className="spinner" /></div>
          ) : (
            <BillDetailView
              bill={detailBill}
              onClose={() => setDetailBill(null)}
              onPay={() => { setDetailBill(null); setPayBillId(detailBill.id); }}
            />
          )}
        </div>
      </div>

      {/* Pay modal */}
      <PayModal
        billId={payBillId}
        bill={bills.find((b) => b.id === payBillId) ?? null}
        onClose={() => setPayBillId(null)}
        onSuccess={() => { setPayBillId(null); refresh(); toast.success('Thanh toán thành công!'); }}
        onError={(m) => toast.error(m)}
      />
    </>
  );
}

function BillDetailView({ bill, onClose, onPay }: { bill: Bill; onClose: () => void; onPay: () => void }) {
  const items = bill.items ?? [];
  const statusClsMap: Record<string, string> = {
    UNPAID: 'bsb-unpaid', PAID: 'bsb-paid', OVERDUE: 'bsb-overdue',
    PENDING_CONFIRMATION: 'bsb-pending', PARTIAL: 'bsb-partial',
  };
  const statusIconMap: Record<string, string> = {
    UNPAID: 'fa-clock', PAID: 'fa-circle-check', OVERDUE: 'fa-circle-exclamation',
    PENDING_CONFIRMATION: 'fa-hourglass-half', PARTIAL: 'fa-circle-half-stroke',
  };
  const itemTypeLabel: Record<string, string> = {
    RENT: 'Tiền thuê', ELECTRICITY: 'Tiền điện', WATER: 'Tiền nước',
    SERVICE: 'Dịch vụ', OTHER: 'Khác', LATE_FEE: 'Phí trễ hạn',
    PARKING: 'Gửi xe', INTERNET: 'Internet',
  };
  const itemTypeIcon: Record<string, string> = {
    RENT: 'fa-house', ELECTRICITY: 'fa-bolt', WATER: 'fa-droplet',
    PARKING: 'fa-car', INTERNET: 'fa-wifi',
  };
  const sc = statusClsMap[bill.status] || 'bsb-unpaid';
  const si = statusIconMap[bill.status] || 'fa-clock';
  const canPay = bill.status === 'UNPAID' || bill.status === 'OVERDUE' || bill.status === 'PARTIAL';

  return (
    <div className="bill-invoice">
      <div className="bill-invoice-header">
        <div className="bill-invoice-logo"><i className="fa-solid fa-file-invoice-dollar" /> TroTot · Hóa đơn</div>
        <div className="bill-invoice-title">Kỳ {bill.period || '-'}</div>
        <div className="bill-invoice-period">
          Hạn thanh toán: {bill.dueDate ? bill.dueDate.split('-').reverse().join('/') : 'Chưa xác định'}
        </div>
      </div>
      <div className="bill-invoice-body">
        <div className="bill-invoice-meta">
          <div className="bill-invoice-meta-item">
            <label><i className="fa-solid fa-user" style={{ marginRight: 3 }} />Người thuê</label>
            <span>{bill.tenantName || '-'}</span>
          </div>
          <div className="bill-invoice-meta-item">
            <label><i className="fa-solid fa-door-open" style={{ marginRight: 3 }} />Phòng</label>
            <span>{bill.roomNo || '-'}{bill.buildingName ? ` · ${bill.buildingName}` : ''}</span>
          </div>
          <div className="bill-invoice-meta-item">
            <label><i className="fa-solid fa-circle-info" style={{ marginRight: 3 }} />Trạng thái</label>
            <span className={`bill-status-badge ${sc}`}><i className={`fa-solid ${si}`} /> {STATUS_MAP[bill.status] || bill.status}</span>
          </div>
          {bill.paidAmount > 0 && (
            <div className="bill-invoice-meta-item">
              <label><i className="fa-solid fa-money-bill-wave" style={{ marginRight: 3 }} />Đã thanh toán</label>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>{fmtNumber(bill.paidAmount)}đ</span>
            </div>
          )}
        </div>

        <table className="bill-invoice-table">
          <thead>
            <tr>
              <th>Khoản mục</th>
              <th style={{ textAlign: 'right' }}>Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={2} style={{ color: 'var(--text-light)', fontStyle: 'italic', padding: 12 }}>Không có chi tiết</td></tr>
            ) : (
              items.map((i) => (
                <tr key={i.id}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fa-solid ${itemTypeIcon[i.itemType] || 'fa-tag'}`} style={{ fontSize: 12, color: 'var(--primary)' }} />
                    </span>
                    <span>{itemTypeLabel[i.itemType] || i.itemType}{i.description && <span style={{ fontSize: 12, color: 'var(--text-light)' }}> ({i.description})</span>}</span>
                  </td>
                  <td className="amount" style={{ textAlign: 'right' }}>{fmtNumber(i.amount)}đ</td>
                </tr>
              ))
            )}
            {bill.lateFee != null && bill.lateFee > 0 && (
              <tr style={{ color: '#842029' }}>
                <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 6, background: '#f8d7da', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 12, color: '#842029' }} />
                  </span>
                  <span>Phí trễ hạn</span>
                </td>
                <td className="amount" style={{ textAlign: 'right', color: '#842029' }}>+{fmtNumber(bill.lateFee)}đ</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="bill-invoice-total">
          <div className="label">TỔNG CỘNG</div>
          <div className="value">{fmtNumber(bill.totalAmount)}đ</div>
        </div>
      </div>
      <div className="bill-invoice-footer">
        <button className="btn btn-outline" onClick={onClose}>Đóng</button>
        {canPay && (
          <button className="btn btn-primary" onClick={onPay}>
            <i className="fa-solid fa-credit-card" /> Thanh toán
          </button>
        )}
      </div>
    </div>
  );
}

function PayModal({
  billId, bill, onClose, onSuccess, onError,
}: { billId: number | null; bill: Bill | null; onClose: () => void; onSuccess: () => void; onError: (m: string) => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bill) {
      setAmount(String(Math.max(0, bill.totalAmount - bill.paidAmount)));
      setMethod('BANK_TRANSFER');
      setRef('');
      setNote('');
    }
  }, [bill]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!billId) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      onError('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    setSubmitting(true);
    try {
      await payBill(billId, { amount: amt, method, referenceCode: ref || undefined, note: note || undefined });
      onSuccess();
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay${billId ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3>Thanh toán hóa đơn</h3>
          <button className="modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Số tiền (đ) *</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min={0} />
            </div>
            <div className="form-group">
              <label>Phương thức thanh toán *</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
                <option value="CASH">Tiền mặt</option>
                <option value="WALLET">Ví điện tử (MoMo/Zalo/Viettel)</option>
                <option value="POINT">Điểm thưởng</option>
              </select>
            </div>
            <div className="form-group">
              <label>Mã giao dịch</label>
              <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Nhập mã sau khi chuyển khoản" />
            </div>
            <div className="form-group">
              <label>Ghi chú</label>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

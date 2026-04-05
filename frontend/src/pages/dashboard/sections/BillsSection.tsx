import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { confirmCashPayment, getBill, listMyBills, listOwnerBills, payBill, resetBillToUnpaid, setBillUtilities } from '@/api/bills';
import { createVnpayPayment } from '@/api/vnpay';
import { uploadImage } from '@/api/upload';
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
  const [utilBill, setUtilBill] = useState<Bill | null>(null);

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
              canManage={isManager}
              onSetUtilities={() => { setUtilBill(detailBill); setDetailBill(null); }}
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

      {/* Utilities modal */}
      <UtilitiesModal
        bill={utilBill}
        onClose={() => setUtilBill(null)}
        onSuccess={() => { setUtilBill(null); refresh(); toast.success('Đã cập nhật tiền điện/nước!'); }}
        onError={(m) => toast.error(m)}
      />
    </>
  );
}

function BillDetailView({
  bill, onClose, onPay, onSetUtilities, canManage,
}: {
  bill: Bill;
  onClose: () => void;
  onPay: () => void;
  onSetUtilities?: () => void;
  canManage?: boolean;
}) {
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

        {/* Lich su giao dich + anh chung tu */}
        {bill.payments && bill.payments.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>
              <i className="fa-solid fa-receipt" style={{ marginRight: 6, color: 'var(--primary)' }} />
              Lịch sử giao dịch
            </div>
            {bill.payments.map((p) => {
              const methodLabel: Record<string, string> = {
                CASH: 'Tiền mặt',
                BANK_TRANSFER: 'Chuyển khoản',
                VNPAY: 'VNPay',
              };
              const statusColor = p.status === 'SUCCESS' ? '#16a34a' : p.status === 'PENDING' ? '#ea580c' : '#6b7280';
              const statusLabel: Record<string, string> = {
                PENDING: 'Chờ xác nhận',
                SUCCESS: 'Đã xác nhận',
                FAILED: 'Thất bại',
              };
              return (
                <div key={p.id} style={{
                  background: '#f9fafb',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 10,
                  fontSize: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700 }}>{methodLabel[p.method] || p.method} — {fmtNumber(p.amount)}đ</span>
                    <span style={{ color: statusColor, fontWeight: 700 }}>{statusLabel[p.status] || p.status}</span>
                  </div>
                  {p.paidAt && (
                    <div style={{ color: 'var(--text-light)', marginBottom: 4 }}>
                      <i className="fa-solid fa-clock" style={{ marginRight: 4 }} />
                      {new Date(p.paidAt).toLocaleString('vi-VN')}
                    </div>
                  )}
                  {p.referenceCode && (
                    <div style={{ color: 'var(--text-light)', marginBottom: 4 }}>
                      Mã GD: <span style={{ fontFamily: 'monospace' }}>{p.referenceCode}</span>
                    </div>
                  )}
                  {p.note && (
                    <div style={{ color: 'var(--text-light)', marginBottom: 4, fontStyle: 'italic' }}>
                      "{p.note}"
                    </div>
                  )}
                  {p.proofImageUrl && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ color: 'var(--text-light)', marginBottom: 4 }}>Ảnh chứng từ:</div>
                      <img
                        src={p.proofImageUrl}
                        alt="chung tu"
                        onClick={() => window.open(p.proofImageUrl!, '_blank')}
                        style={{
                          maxWidth: '100%',
                          maxHeight: 240,
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          cursor: 'zoom-in',
                          objectFit: 'cover',
                        }}
                        title="Click để phóng to"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="bill-invoice-footer">
        <button className="btn btn-outline" onClick={onClose}>Đóng</button>
        {canManage && onSetUtilities && canPay && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={onSetUtilities}
            style={{ color: '#059669', borderColor: '#059669' }}
          >
            <i className="fa-solid fa-bolt" /> Cập nhật điện/nước
          </button>
        )}
        {canPay && !canManage && (
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
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bill) {
      setAmount(String(Math.max(0, bill.totalAmount - bill.paidAmount)));
      setMethod('BANK_TRANSFER');
      setRef('');
      setNote('');
      setProofImageUrl('');
    }
  }, [bill]);

  const handleUploadProof = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setProofImageUrl(url);
    } catch (err) {
      onError(getErrorMessage(err, 'Upload ảnh thất bại'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!billId) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      onError('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (method === 'BANK_TRANSFER' && !proofImageUrl) {
      onError('Vui lòng đính kèm ảnh chứng từ chuyển khoản');
      return;
    }
    setSubmitting(true);
    try {
      await payBill(billId, {
        amount: amt,
        method,
        referenceCode: ref || undefined,
        note: note || undefined,
        proofImageUrl: proofImageUrl || undefined,
      });
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
          <h3>Khai báo thanh toán</h3>
          <button className="modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#92400e' }}>
              <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
              Sau khi khai báo, hóa đơn sẽ ở trạng thái <strong>Chờ xác nhận</strong>. Chủ nhà sẽ kiểm tra và xác nhận đã nhận tiền.
            </div>

            <div className="form-group">
              <label>Số tiền (đ) *</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min={0} />
            </div>
            <div className="form-group">
              <label>Phương thức thanh toán *</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
                <option value="CASH">Tiền mặt</option>
              </select>
            </div>

            {method === 'BANK_TRANSFER' && (
              <>
                <div className="form-group">
                  <label>Mã giao dịch</label>
                  <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Nhập mã sau khi chuyển khoản" />
                </div>
                <div className="form-group">
                  <label>Ảnh chứng từ chuyển khoản *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleUploadProof(e.target.files?.[0] ?? null)}
                  />
                  {proofImageUrl ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={proofImageUrl}
                        alt="chung tu"
                        style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '1px solid var(--border)', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => setProofImageUrl('')}
                        style={{
                          position: 'absolute', top: 6, right: 6,
                          width: 28, height: 28, borderRadius: '50%', border: 'none',
                          background: 'rgba(0,0,0,0.6)', color: 'white',
                          cursor: 'pointer', fontSize: 13,
                        }}
                        title="Xóa ảnh"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        width: '100%', padding: '24px 12px',
                        border: '2px dashed var(--border)', borderRadius: 8,
                        background: '#f9fafb', cursor: uploading ? 'wait' : 'pointer',
                        fontSize: 13, color: '#6b7280',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      }}
                    >
                      {uploading ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 22 }} />
                          <span>Đang upload...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 24, color: 'var(--primary)' }} />
                          <span>Bấm để chọn ảnh chứng từ (JPG, PNG, tối đa 5MB)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}

            <div className="form-group">
              <label>Ghi chú</label>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Đã chuyển khoản qua Vietcombank..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
              {submitting ? 'Đang gửi...' : 'Gửi khai báo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal cap nhat tien dien/nuoc — cho Owner/Manager
function UtilitiesModal({
  bill, onClose, onSuccess, onError,
}: {
  bill: Bill | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: (m: string) => void;
}) {
  const [elecOld, setElecOld] = useState('');
  const [elecNew, setElecNew] = useState('');
  const [waterOld, setWaterOld] = useState('');
  const [waterNew, setWaterNew] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-populate từ BillItem hiện có (nếu đã từng cập nhật)
  useEffect(() => {
    if (!bill) {
      setElecOld(''); setElecNew(''); setWaterOld(''); setWaterNew('');
      return;
    }
    const items = bill.items ?? [];
    const elecItem = items.find((i) => i.itemType === 'ELECTRICITY') as (typeof items[0] & { previousReading?: number; currentReading?: number }) | undefined;
    const waterItem = items.find((i) => i.itemType === 'WATER') as (typeof items[0] & { previousReading?: number; currentReading?: number }) | undefined;
    setElecOld(elecItem?.previousReading != null ? String(elecItem.previousReading) : '');
    setElecNew(elecItem?.currentReading != null ? String(elecItem.currentReading) : '');
    setWaterOld(waterItem?.previousReading != null ? String(waterItem.previousReading) : '');
    setWaterNew(waterItem?.currentReading != null ? String(waterItem.currentReading) : '');
  }, [bill]);

  // Don gia mac dinh (chi de preview — backend se lay tu Building)
  const ELEC_PRICE = 3500;
  const WATER_PRICE = 20000;

  const elecOldN = parseFloat(elecOld) || 0;
  const elecNewN = parseFloat(elecNew) || 0;
  const waterOldN = parseFloat(waterOld) || 0;
  const waterNewN = parseFloat(waterNew) || 0;
  const elecConsumption = Math.max(0, elecNewN - elecOldN);
  const waterConsumption = Math.max(0, waterNewN - waterOldN);
  const elecAmount = elecConsumption * ELEC_PRICE;
  const waterAmount = waterConsumption * WATER_PRICE;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!bill) return;
    if (elecNewN < elecOldN) {
      onError('Số điện mới phải ≥ số điện cũ');
      return;
    }
    if (waterNewN < waterOldN) {
      onError('Số nước mới phải ≥ số nước cũ');
      return;
    }
    setSubmitting(true);
    try {
      await setBillUtilities(bill.id, {
        electricityOld: elecOld ? elecOldN : null,
        electricityNew: elecNew ? elecNewN : null,
        waterOld: waterOld ? waterOldN : null,
        waterNew: waterNew ? waterNewN : null,
      });
      onSuccess();
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay${bill ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3><i className="fa-solid fa-bolt" style={{ color: '#059669', marginRight: 6 }} />Cập nhật tiền điện/nước</h3>
          <button className="modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#065f46' }}>
              <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
              Nhập số công tơ cũ và mới. Hệ thống sẽ tự tính tiền theo đơn giá của tòa nhà và cập nhật vào hóa đơn.
            </div>

            {/* Dien */}
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#ca8a04' }}>
                <i className="fa-solid fa-bolt" /> Tiền điện
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Số điện cũ (kWh)</label>
                  <input type="number" step="any" value={elecOld} onChange={(e) => setElecOld(e.target.value)} placeholder="VD: 1250" />
                </div>
                <div className="form-group">
                  <label>Số điện mới (kWh)</label>
                  <input type="number" step="any" value={elecNew} onChange={(e) => setElecNew(e.target.value)} placeholder="VD: 1350" />
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                Tiêu thụ: <strong>{elecConsumption} kWh</strong> × {fmtNumber(ELEC_PRICE)}đ/kWh = <strong style={{ color: '#ca8a04' }}>{fmtNumber(elecAmount)}đ</strong>
              </div>
            </div>

            {/* Nuoc */}
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#0284c7' }}>
                <i className="fa-solid fa-droplet" /> Tiền nước
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Số nước cũ (m³)</label>
                  <input type="number" step="any" value={waterOld} onChange={(e) => setWaterOld(e.target.value)} placeholder="VD: 45" />
                </div>
                <div className="form-group">
                  <label>Số nước mới (m³)</label>
                  <input type="number" step="any" value={waterNew} onChange={(e) => setWaterNew(e.target.value)} placeholder="VD: 52" />
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                Tiêu thụ: <strong>{waterConsumption} m³</strong> × {fmtNumber(WATER_PRICE)}đ/m³ = <strong style={{ color: '#0284c7' }}>{fmtNumber(waterAmount)}đ</strong>
              </div>
            </div>

            <div style={{
              background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8,
              padding: '12px 14px', fontSize: 13, color: '#92400e',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span><strong>Tổng tiền điện + nước:</strong></span>
              <strong style={{ fontSize: 16 }}>{fmtNumber(elecAmount + waterAmount)}đ</strong>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu và cập nhật hóa đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

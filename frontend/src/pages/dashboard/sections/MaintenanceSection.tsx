import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createMaintenance, listMaintenanceByBuilding, listMyMaintenance, updateMaintenanceStatus } from '@/api/maintenance';
import { listMyBuildings } from '@/api/buildings';
import { uploadImage } from '@/api/upload';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/api/client';
import { fmtDate } from '@/lib/format';
import type { MaintenanceRequest, MaintPriority } from '@/types/maintenance';

function maintBadge(status: string) {
  const map: Record<string, { cls: string; label: string }> = {
    NEW:         { cls: 'badge-blue',   label: 'Mới' },
    IN_PROGRESS: { cls: 'badge-orange', label: 'Đang xử lý' },
    DONE:        { cls: 'badge-green',  label: 'Hoàn thành' },
    CANCELLED:   { cls: 'badge-gray',   label: 'Hủy' },
  };
  const b = map[status] ?? { cls: 'badge-gray', label: status };
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}

export default function MaintenanceSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ description: '', priority: 'MEDIUM' as MaintPriority, imageUrl: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
      toast.success('Upload ảnh thành công');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload ảnh thất bại'));
    } finally {
      setUploading(false);
    }
  };

  const isTenant = user?.role === 'TENANT';
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const refresh = async () => {
    setLoading(true);
    try {
      if (isTenant) {
        setItems(await listMyMaintenance());
      } else {
        const buildings = await listMyBuildings();
        // Parallel fetch: N+1 requests run concurrently instead of sequentially
        const lists = await Promise.all(
          buildings.map((b) => listMaintenanceByBuilding(b.id).catch(() => [] as MaintenanceRequest[]))
        );
        setItems(lists.flat());
      }
    } catch {
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (id: number, status: 'IN_PROGRESS' | 'DONE') => {
    try {
      await updateMaintenanceStatus(id, { status });
      toast.success('Cập nhật trạng thái thành công!');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      toast.error('Vui lòng mô tả vấn đề!');
      return;
    }
    setSaving(true);
    try {
      await createMaintenance({ description: form.description, priority: form.priority, imageUrl: form.imageUrl || undefined });
      toast.success('Gửi yêu cầu thành công!');
      setModalOpen(false);
      setForm({ description: '', priority: 'MEDIUM', imageUrl: '' });
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="section-card">
        <div className="section-head">
          <h3><i className="fa-solid fa-screwdriver-wrench" style={{ color: 'var(--primary)' }} /> Yêu cầu bảo trì</h3>
          {isTenant && (
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <i className="fa-solid fa-plus" /> Gửi yêu cầu
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading"><span className="spinner" /> Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="empty"><div className="empty-icon">🔧</div><p>Chưa có yêu cầu bảo trì nào</p></div>
        ) : (
          <div style={{ padding: 16 }}>
            {items.map((m) => (
              <div key={m.id} className="maint-card">
                <div className="maint-head">
                  <div>
                    <span className={`priority-dot priority-${m.priority || 'LOW'}`} />
                    <strong>{(m.description?.substring(0, 60) || 'Yêu cầu bảo trì') + ((m.description?.length ?? 0) > 60 ? '...' : '')}</strong>
                  </div>
                  {maintBadge(m.status)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-light)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span><i className="fa-solid fa-calendar" /> {fmtDate(m.createdAt)}</span>
                  <span><i className="fa-solid fa-door-open" /> Phòng {m.roomId || '-'}</span>
                  {m.priority && (
                    <span>
                      <i className="fa-solid fa-flag" /> Ưu tiên: {m.priority === 'HIGH' ? 'Cao' : m.priority === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
                    </span>
                  )}
                </div>
                {canManage && m.status === 'NEW' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-primary" onClick={() => updateStatus(m.id, 'IN_PROGRESS')}>
                      <i className="fa-solid fa-play" /> Tiếp nhận
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => updateStatus(m.id, 'DONE')}>
                      <i className="fa-solid fa-check" /> Hoàn thành
                    </button>
                  </div>
                )}
                {canManage && m.status === 'IN_PROGRESS' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => updateStatus(m.id, 'DONE')}>
                      <i className="fa-solid fa-check" /> Đã xử lý xong
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <div className={`modal-overlay${modalOpen ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <div className="modal">
          <div className="modal-head">
            <h3>Gửi yêu cầu bảo trì</h3>
            <button className="modal-close" onClick={() => setModalOpen(false)}><i className="fa-solid fa-xmark" /></button>
          </div>
          <form onSubmit={submit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Mô tả vấn đề *</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="VD: Máy lạnh bị rò nước..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Mức độ ưu tiên</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as MaintPriority })}>
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HIGH">Cao</option>
                </select>
              </div>
              <div className="form-group">
                <label>Ảnh minh họa (nếu có)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
                {form.imageUrl ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={form.imageUrl}
                      alt="minh hoa"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 200,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        objectFit: 'cover',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: '' })}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: 13,
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
                      width: '100%',
                      padding: '20px 12px',
                      border: '2px dashed var(--border)',
                      borderRadius: 8,
                      background: '#f9fafb',
                      cursor: uploading ? 'wait' : 'pointer',
                      fontSize: 13,
                      color: '#6b7280',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {uploading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 20 }} />
                        <span>Đang upload...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 22, color: 'var(--primary)' }} />
                        <span>Bấm để chọn ảnh (JPG, PNG, tối đa 5MB)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

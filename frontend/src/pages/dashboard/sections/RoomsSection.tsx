import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createRoomInBuilding, listMyBuildings, listRoomsInBuilding } from '@/api/buildings';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/api/client';
import { fmtNumber } from '@/lib/format';
import type { Building, Room, RoomCreate } from '@/types/building';

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Còn phòng',
  OCCUPIED: 'Đang thuê',
  RESERVED: 'Đã đặt',
  HANDOVER: 'Bàn giao',
  MAINTENANCE: 'Đang sửa',
};
const STATUS_CLASS: Record<string, string> = {
  AVAILABLE: 'status-available',
  OCCUPIED: 'status-occupied',
  RESERVED: 'badge-blue',
  MAINTENANCE: 'status-maintenance',
};
const STATUS_EMOJI: Record<string, string> = {
  AVAILABLE: '🏠',
  OCCUPIED: '🏡',
  RESERVED: '🔑',
  MAINTENANCE: '🔧',
};

type RoomWithBuilding = Room & { buildingName?: string; buildingId?: number };

export default function RoomsSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<RoomWithBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RoomCreate & { buildingId: number }>({ buildingId: 0, roomNo: '', price: 0 });
  const [saving, setSaving] = useState(false);

  // MANAGER chi duoc xem phong cua building duoc assign, khong tao/sua/upload media
  const canEdit = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const refresh = async () => {
    setLoading(true);
    try {
      const blds = await listMyBuildings();
      setBuildings(blds);
      if (blds.length === 0) {
        setRooms([]);
        return;
      }
      // Parallel fetch rooms for all buildings
      const roomLists = await Promise.all(
        blds.map((b) => listRoomsInBuilding(b.id).catch(() => []).then((rms) =>
          rms.map((rm) => ({ ...rm, buildingName: b.name, buildingId: b.id }))
        ))
      );
      setRooms(roomLists.flat());
    } catch {
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    if (buildings.length === 0) {
      toast.error('Cần tạo tòa nhà trước');
      return;
    }
    setForm({ buildingId: buildings[0].id, roomNo: '', price: 0 });
    setModalOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.buildingId || !form.roomNo || !form.price) {
      toast.error('Vui lòng điền đầy đủ!');
      return;
    }
    setSaving(true);
    try {
      const { buildingId, ...payload } = form;
      await createRoomInBuilding(buildingId, payload);
      toast.success('Thêm phòng thành công!');
      setModalOpen(false);
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
          <h3><i className="fa-solid fa-door-open" style={{ color: 'var(--primary)' }} /> Quản lý phòng</h3>
          {canEdit && (
            <button className="btn btn-primary" onClick={openCreate}>
              <i className="fa-solid fa-plus" /> Thêm phòng
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading"><span className="spinner" /> Đang tải...</div>
        ) : buildings.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏗️</div>
            <p>Cần tạo tòa nhà trước khi thêm phòng</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🚪</div>
            <p>Chưa có phòng nào</p>
          </div>
        ) : (
          <div className="room-grid">
            {rooms.map((r) => (
              <div key={r.id} className="room-card">
                <div className="room-card-img">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.roomNo} />
                  ) : (
                    <span>{STATUS_EMOJI[r.status] ?? '🏠'}</span>
                  )}
                  <div className={`room-status ${STATUS_CLASS[r.status] ?? 'status-occupied'}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </div>
                </div>
                <div className="room-card-body">
                  <h4>Phòng {r.roomNo}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 6 }}>{r.buildingName ?? ''}</p>
                  <div className="room-meta">
                    {r.area != null && <span><i className="fa-solid fa-expand" />{r.area}m²</span>}
                    {r.beds != null && <span><i className="fa-solid fa-bed" />{r.beds} giường</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <div className="price">
                      {fmtNumber(r.price)}đ<span style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 500 }}>/tháng</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {canEdit && (
                        <button className="btn btn-sm btn-outline" title="Upload ảnh/video">
                          <i className="fa-solid fa-photo-film" />
                        </button>
                      )}
                      {canEdit && r.status === 'AVAILABLE' && (
                        <button className="btn btn-sm btn-primary" onClick={() => toast.show('Tính năng đang phát triển')}>
                          Tạo HĐ
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <div className={`modal-overlay${modalOpen ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
        <div className="modal">
          <div className="modal-head">
            <h3>Thêm phòng</h3>
            <button className="modal-close" onClick={() => setModalOpen(false)}><i className="fa-solid fa-xmark" /></button>
          </div>
          <form onSubmit={submit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Tòa nhà *</label>
                <select value={form.buildingId} onChange={(e) => setForm({ ...form, buildingId: Number(e.target.value) })}>
                  {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Số phòng *</label>
                  <input value={form.roomNo} onChange={(e) => setForm({ ...form, roomNo: e.target.value })} placeholder="VD: A101" required />
                </div>
                <div className="form-group">
                  <label>Giá (đ/tháng) *</label>
                  <input type="number" value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Diện tích (m²)</label>
                  <input type="number" value={form.area ?? ''} onChange={(e) => setForm({ ...form, area: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div className="form-group">
                  <label>Số giường</label>
                  <input type="number" value={form.beds ?? ''} onChange={(e) => setForm({ ...form, beds: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
              </div>
              <div className="form-group">
                <label>Tiện nghi</label>
                <input value={form.amenities ?? ''} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="Máy lạnh, Wifi, Nước nóng..." />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Thêm phòng'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

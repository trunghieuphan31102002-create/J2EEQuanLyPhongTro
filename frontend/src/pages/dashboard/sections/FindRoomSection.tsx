import { useEffect, useState, type FormEvent } from 'react';
import { searchBuildings, getBuildingRooms } from '@/api/marketplace';
import { applyForRoom } from '@/api/rentalRequests';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/api/client';
import { fmtNumber } from '@/lib/format';
import type { RoomListing } from '@/types/marketplace';

const STATUS_MAP: Record<string, string> = {
  AVAILABLE: 'Còn phòng',
  OCCUPIED: 'Đang thuê',
  RESERVED: 'Đã đặt',
  MAINTENANCE: 'Đang sửa',
};

type RoomWithBuilding = RoomListing & { buildingName?: string | null; buildingAddress?: string | null };

export default function FindRoomSection() {
  const toast = useToast();
  const [keyword, setKeyword] = useState('');
  const [rooms, setRooms] = useState<RoomWithBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyRoom, setApplyRoom] = useState<RoomWithBuilding | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const search = async (kw: string) => {
    setLoading(true);
    try {
      const buildings = await searchBuildings(kw);
      if (buildings.length === 0) {
        setRooms([]);
        return;
      }
      const all: RoomWithBuilding[] = [];
      for (const b of buildings) {
        try {
          const list = await getBuildingRooms(b.id);
          list.forEach((r) => all.push({ ...r, buildingName: b.name, buildingAddress: b.address }));
        } catch { /* skip */ }
      }
      setRooms(all.filter((r) => r.status === 'AVAILABLE'));
    } catch {
      toast.error('Lỗi tải dữ liệu');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search on keyword change
  useEffect(() => {
    const id = setTimeout(() => search(keyword), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const openApply = (room: RoomWithBuilding) => {
    setApplyRoom(room);
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate('');
    setNote('');
  };

  const submitApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!applyRoom) return;
    if (!startDate || !endDate) {
      toast.error('Vui lòng chọn ngày bắt đầu và kết thúc!');
      return;
    }
    if (endDate <= startDate) {
      toast.error('Ngày kết thúc phải sau ngày bắt đầu!');
      return;
    }
    setSubmitting(true);
    try {
      await applyForRoom({ roomId: applyRoom.id, startDate, endDate, note });
      toast.success('Đã gửi yêu cầu thuê! Chờ chủ nhà duyệt.');
      setApplyRoom(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Lỗi gửi yêu cầu'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="section-card">
        <div className="section-head">
          <h3><i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--primary)' }} /> Tìm phòng trọ</h3>
        </div>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên tòa nhà, địa chỉ..."
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 9, fontSize: 14, fontFamily: "'Nunito',sans-serif" }}
          />
        </div>

        {loading ? (
          <div className="loading"><span className="spinner" /> Đang tải...</div>
        ) : rooms.length === 0 ? (
          <div className="empty"><div className="empty-icon">🏠</div><p>Hiện không có phòng trống nào</p></div>
        ) : (
          <div className="room-grid">
            {rooms.map((r) => (
              <div key={r.id} className="room-card">
                <div className="room-card-img">
                  {r.imageUrl ? <img src={r.imageUrl} alt="" /> : <span>🏠</span>}
                  <div className="room-status status-available">{STATUS_MAP[r.status] || r.status}</div>
                </div>
                <div className="room-card-body">
                  <h4>Phòng {r.roomNo}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>{r.buildingName}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 8 }}>{r.buildingAddress || ''}</p>
                  <div className="room-meta">
                    {r.area != null && <span><i className="fa-solid fa-expand" /> {r.area}m²</span>}
                    {r.beds != null && <span><i className="fa-solid fa-bed" /> {r.beds} giường</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 15 }}>{fmtNumber(r.price)}đ/tháng</span>
                    <button className="btn btn-sm btn-primary" onClick={() => openApply(r)}>
                      <i className="fa-solid fa-file-signature" /> Đăng ký
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply modal */}
      <div className={`modal-overlay${applyRoom ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setApplyRoom(null); }}>
        <div className="modal">
          <div className="modal-head">
            <h3>Đăng ký thuê phòng</h3>
            <button className="modal-close" onClick={() => setApplyRoom(null)}><i className="fa-solid fa-xmark" /></button>
          </div>
          {applyRoom && (
            <form onSubmit={submitApply}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700 }}>🏠 Phòng {applyRoom.roomNo} • {applyRoom.buildingName}</div>
                  <div style={{ color: 'var(--primary)', fontWeight: 700, marginTop: 4 }}>
                    {fmtNumber(applyRoom.price)}đ/tháng
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ngày bắt đầu *</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Ngày kết thúc *</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Ghi chú cho chủ nhà</label>
                  <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: Tôi muốn xem phòng vào cuối tuần..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setApplyRoom(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu thuê'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

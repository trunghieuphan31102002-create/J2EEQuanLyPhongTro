import { useEffect, useState, useRef, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createRoomInBuilding, deleteRoom, listMyBuildings, listRoomsInBuilding, updateRoom, updateRoomMedia } from '@/api/buildings';
import { uploadImage, uploadVideo } from '@/api/upload';
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
  const [createImgFile, setCreateImgFile] = useState<File | null>(null);
  const [createImgPreview, setCreateImgPreview] = useState<string | null>(null);

  // Upload media state
  const [uploadModal, setUploadModal] = useState<RoomWithBuilding | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  // Edit room state
  const [editModal, setEditModal] = useState<RoomWithBuilding | null>(null);
  const [editForm, setEditForm] = useState<RoomCreate & { buildingId: number }>({ buildingId: 0, roomNo: '', price: 0 });
  const [editSaving, setEditSaving] = useState(false);
  const [editImgFile, setEditImgFile] = useState<File | null>(null);
  const [editImgPreview, setEditImgPreview] = useState<string | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState<number | null>(null);

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
    setCreateImgFile(null);
    setCreateImgPreview(null);
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
      if (createImgFile) {
        payload.imageUrl = await uploadImage(createImgFile);
      }
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

  const handleUploadMedia = async () => {
    if (!uploadModal) return;
    const imgFile = imageRef.current?.files?.[0];
    const vidFile = videoRef.current?.files?.[0];
    if (!imgFile && !vidFile) {
      toast.error('Vui lòng chọn ít nhất 1 ảnh hoặc video');
      return;
    }
    setUploading(true);
    try {
      let imageUrl = uploadModal.imageUrl ?? null;
      let videoUrl = uploadModal.videoUrl ?? null;
      if (imgFile) imageUrl = await uploadImage(imgFile);
      if (vidFile) videoUrl = await uploadVideo(vidFile);
      await updateRoomMedia(uploadModal.buildingId!, uploadModal.id, imageUrl, videoUrl);
      toast.success('Cập nhật ảnh/video thành công!');
      setUploadModal(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const openEditRoom = (r: RoomWithBuilding) => {
    setEditModal(r);
    setEditForm({
      buildingId: r.buildingId!,
      roomNo: r.roomNo,
      price: r.price,
      area: r.area ?? undefined,
      beds: r.beds ?? undefined,
      amenities: r.amenities ?? '',
      description: r.description ?? '',
    });
    setEditImgFile(null);
    setEditImgPreview(r.imageUrl ?? null);
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setEditSaving(true);
    try {
      const payload: Partial<RoomCreate> = {
        roomNo: editForm.roomNo,
        price: editForm.price,
        area: editForm.area,
        beds: editForm.beds,
        amenities: editForm.amenities,
        description: editForm.description,
      };
      if (editImgFile) {
        payload.imageUrl = await uploadImage(editImgFile);
      }
      await updateRoom(editModal.buildingId!, editModal.id, payload);
      toast.success('Cập nhật phòng thành công!');
      setEditModal(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (r: RoomWithBuilding) => {
    if (!confirm(`Bạn có chắc muốn xóa phòng ${r.roomNo}? Hành động này không thể hoàn tác.`)) return;
    setDeleting(r.id);
    try {
      await deleteRoom(r.buildingId!, r.id);
      toast.success(`Đã xóa phòng ${r.roomNo}`);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(null);
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
                        <>
                          <button className="btn btn-sm btn-outline" title="Sửa phòng" onClick={() => openEditRoom(r)}>
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button className="btn btn-sm btn-outline" title="Upload ảnh/video" onClick={() => setUploadModal(r)}>
                            <i className="fa-solid fa-photo-film" />
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            title="Xóa phòng"
                            style={{ color: '#ef4444', borderColor: '#ef4444' }}
                            disabled={deleting === r.id}
                            onClick={() => handleDelete(r)}
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload media modal */}
      <div className={`modal-overlay${uploadModal ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setUploadModal(null); }}>
        <div className="modal">
          <div className="modal-head">
            <h3>Upload ảnh/video — Phòng {uploadModal?.roomNo}</h3>
            <button className="modal-close" onClick={() => setUploadModal(null)}><i className="fa-solid fa-xmark" /></button>
          </div>
          <div className="modal-body">
            {uploadModal?.imageUrl && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text-light)' }}>Ảnh hiện tại:</label>
                <img src={uploadModal.imageUrl} alt="current" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginTop: 4 }} />
              </div>
            )}
            <div className="form-group">
              <label>Chọn ảnh mới (JPG, PNG, WebP)</label>
              <input ref={imageRef} type="file" accept="image/*" />
            </div>
            {uploadModal?.videoUrl && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text-light)' }}>Video hiện tại:</label>
                <video src={uploadModal.videoUrl} controls style={{ width: '100%', maxHeight: 120, borderRadius: 8, marginTop: 4 }} />
              </div>
            )}
            <div className="form-group">
              <label>Chọn video mới (MP4, WebM)</label>
              <input ref={videoRef} type="file" accept="video/*" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setUploadModal(null)}>Hủy</button>
            <button type="button" className="btn btn-primary" disabled={uploading} onClick={handleUploadMedia}>
              {uploading ? 'Đang upload...' : 'Lưu ảnh/video'}
            </button>
          </div>
        </div>
      </div>

      {/* Edit room modal */}
      <div className={`modal-overlay${editModal ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setEditModal(null); }}>
        <div className="modal">
          <div className="modal-head">
            <h3>Sửa phòng {editModal?.roomNo}</h3>
            <button className="modal-close" onClick={() => setEditModal(null)}><i className="fa-solid fa-xmark" /></button>
          </div>
          <form onSubmit={submitEdit}>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Số phòng *</label>
                  <input value={editForm.roomNo} onChange={(e) => setEditForm({ ...editForm, roomNo: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Giá (đ/tháng) *</label>
                  <input type="number" value={editForm.price || ''} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Diện tích (m²)</label>
                  <input type="number" value={editForm.area ?? ''} onChange={(e) => setEditForm({ ...editForm, area: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div className="form-group">
                  <label>Số giường</label>
                  <input type="number" value={editForm.beds ?? ''} onChange={(e) => setEditForm({ ...editForm, beds: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
              </div>
              <div className="form-group">
                <label>Tiện nghi</label>
                <input value={editForm.amenities ?? ''} onChange={(e) => setEditForm({ ...editForm, amenities: e.target.value })} placeholder="Máy lạnh, Wifi, Nước nóng..." />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea rows={2} value={editForm.description ?? ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Ảnh phòng</label>
                {editImgPreview && <img src={editImgPreview} alt="preview" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                <input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setEditImgFile(f); setEditImgPreview(URL.createObjectURL(f)); }
                }} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setEditModal(null)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={editSaving}>
                {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
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
              <div className="form-group">
                <label>Ảnh phòng</label>
                {createImgPreview && <img src={createImgPreview} alt="preview" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                <input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setCreateImgFile(f); setCreateImgPreview(URL.createObjectURL(f)); }
                }} />
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

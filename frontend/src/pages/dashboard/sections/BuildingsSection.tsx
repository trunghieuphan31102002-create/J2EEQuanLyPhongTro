import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  assignBuildingManager,
  createBuilding,
  listAvailableManagers,
  listMyBuildings,
} from '@/api/buildings';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/api/client';
import type { Building, BuildingCreate, ManagerOption } from '@/types/building';

export default function BuildingsSection() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BuildingCreate>({ name: '', address: '', description: '', publishStatus: 'PRIVATE' });
  const [saving, setSaving] = useState(false);

  // Assign manager state
  const [assignModal, setAssignModal] = useState<Building | null>(null);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [pickedManagerId, setPickedManagerId] = useState<number | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);

  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';

  const refresh = () => {
    setLoading(true);
    listMyBuildings()
      .then(setBuildings)
      .catch(() => toast.error('Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address) {
      toast.error('Vui lòng điền đầy đủ thông tin!');
      return;
    }
    setSaving(true);
    try {
      await createBuilding(form);
      toast.success('Tạo tòa nhà thành công!');
      setModalOpen(false);
      setForm({ name: '', address: '', description: '', publishStatus: 'PRIVATE' });
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Lỗi tạo tòa nhà'));
    } finally {
      setSaving(false);
    }
  };

  const openAssign = async (b: Building) => {
    setAssignModal(b);
    setPickedManagerId(b.assignedManager?.id ?? null);
    try {
      const list = await listAvailableManagers();
      setManagers(list);
    } catch {
      toast.error('Không tải được danh sách quản lý');
    }
  };

  const submitAssign = async () => {
    if (!assignModal) return;
    setAssignSaving(true);
    try {
      await assignBuildingManager(assignModal.id, pickedManagerId);
      toast.success(pickedManagerId ? 'Đã gán quản lý' : 'Đã bỏ quản lý');
      setAssignModal(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAssignSaving(false);
    }
  };

  return (
    <>
      <div className="section-card">
        <div className="section-head">
          <h3>
            <i className="fa-solid fa-building" style={{ color: 'var(--primary)' }} />{' '}
            {isManager ? 'Tòa nhà được giao' : 'Tòa nhà của tôi'}
          </h3>
          {isOwner && (
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <i className="fa-solid fa-plus" /> Thêm tòa nhà
            </button>
          )}
        </div>
        {loading ? (
          <div className="loading"><span className="spinner" /> Đang tải...</div>
        ) : buildings.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏗️</div>
            <p>
              {isManager
                ? 'Chưa được giao quản lý tòa nhà nào. Vui lòng liên hệ chủ trọ.'
                : 'Chưa có tòa nhà nào. Hãy thêm tòa nhà đầu tiên!'}
            </p>
            {isOwner && (
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModalOpen(true)}>
                <i className="fa-solid fa-plus" /> Thêm ngay
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20, padding: 20 }}>
            {buildings.map((b) => (
              <div key={b.id} style={{ border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', transition: '.2s' }}>
                <div style={{ height: 120, background: 'linear-gradient(135deg,#F2C185,#D4845A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                  🏢
                </div>
                <div style={{ padding: 16 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{b.name}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>
                    <i className="fa-solid fa-location-dot" /> {b.address || 'Chưa có địa chỉ'}
                  </p>
                  {b.assignedManager ? (
                    <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 10 }}>
                      <i className="fa-solid fa-user-tie" style={{ color: '#3b82f6' }} />{' '}
                      Quản lý: <b>{b.assignedManager.fullName}</b>
                    </p>
                  ) : isOwner ? (
                    <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 10, fontStyle: 'italic' }}>
                      <i className="fa-solid fa-user-slash" /> Chưa gán quản lý
                    </p>
                  ) : null}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`badge ${b.publishStatus === 'PUBLIC' ? 'badge-green' : 'badge-gray'}`}>
                      {b.publishStatus === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
                    </span>
                    <button className="btn btn-sm btn-outline" onClick={() => navigate('/dashboard/rooms')}>
                      <i className="fa-solid fa-door-open" /> Xem phòng
                    </button>
                    {isOwner && (
                      <button className="btn btn-sm btn-outline" onClick={() => openAssign(b)}>
                        <i className="fa-solid fa-user-tie" /> {b.assignedManager ? 'Đổi QL' : 'Gán QL'}
                      </button>
                    )}
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
            <h3>Thêm tòa nhà</h3>
            <button className="modal-close" onClick={() => setModalOpen(false)}><i className="fa-solid fa-xmark" /></button>
          </div>
          <form onSubmit={submit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên tòa nhà *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Chung cư A" required />
              </div>
              <div className="form-group">
                <label>Địa chỉ *</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="VD: 123 Nguyễn Huệ, Q1, TP.HCM" required />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Trạng thái hiển thị</label>
                <select value={form.publishStatus} onChange={(e) => setForm({ ...form, publishStatus: e.target.value as 'PUBLIC' | 'PRIVATE' })}>
                  <option value="PRIVATE">Riêng tư</option>
                  <option value="PUBLIC">Công khai (marketplace)</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Tạo tòa nhà'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Assign manager modal */}
      <div className={`modal-overlay${assignModal ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setAssignModal(null); }}>
        <div className="modal">
          <div className="modal-head">
            <h3>Gán quản lý cho {assignModal?.name}</h3>
            <button className="modal-close" onClick={() => setAssignModal(null)}><i className="fa-solid fa-xmark" /></button>
          </div>
          <div className="modal-body">
            {managers.length === 0 ? (
              <div className="empty" style={{ padding: 24 }}>
                <div className="empty-icon">👤</div>
                <p>Chưa có tài khoản quản lý nào trong hệ thống.</p>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  Admin cần tạo tài khoản role MANAGER trước.
                </p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Chọn quản lý</label>
                  <select
                    value={pickedManagerId ?? ''}
                    onChange={(e) => setPickedManagerId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">-- Không gán (bỏ quản lý) --</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  Quản lý sẽ được phép: nhập điện/nước, thêm khoản phí, xử lý bảo trì và xác nhận tiền mặt cho tòa nhà này.
                </p>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setAssignModal(null)}>Hủy</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={assignSaving || managers.length === 0}
              onClick={submitAssign}
            >
              {assignSaving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

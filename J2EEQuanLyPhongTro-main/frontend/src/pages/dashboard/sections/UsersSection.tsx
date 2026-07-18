import { useEffect, useMemo, useState } from 'react';
import { changeUserRole, getUserById, listAllUsers, toggleUserActive } from '@/api/admin';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/api/client';
import type { UserRole } from '@/types/api';
import type { Profile } from '@/types/profile';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', OWNER: 'Chủ nhà', MANAGER: 'Quản lý', TENANT: 'Người thuê' };
const ROLE_BADGE_CLASS: Record<string, string> = { ADMIN: 'badge-red', OWNER: 'badge-orange', MANAGER: 'badge-green', TENANT: 'badge-blue' };
const ROLE_ICONS: Record<string, string> = { ADMIN: 'fa-shield-halved', OWNER: 'fa-house-user', MANAGER: 'fa-user-tie', TENANT: 'fa-user' };
const ROLE_DESCS: Record<string, string> = {
  ADMIN: 'Toàn quyền quản trị hệ thống',
  OWNER: 'Quản lý tòa nhà và phòng trọ',
  MANAGER: 'Hỗ trợ quản lý, bảo trì',
  TENANT: 'Người thuê phòng trọ',
};

function initials(name: string | null | undefined): string {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function UsersSection() {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [search, setSearch] = useState('');
  const [detailUser, setDetailUser] = useState<Profile | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<Profile | null>(null);
  const [crSelectedRole, setCrSelectedRole] = useState<UserRole | null>(null);

  const refresh = (role: UserRole | '' = roleFilter) => {
    setLoading(true);
    listAllUsers(role)
      .then(setUsers)
      .catch(() => toast.error('Không có quyền xem'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(roleFilter); }, [roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.active).length;
    const locked = total - active;
    const roles: Record<string, number> = {};
    users.forEach((u) => { roles[u.role] = (roles[u.role] || 0) + 1; });
    return { total, active, locked, roles };
  }, [users]);

  const handleToggleActive = async (u: Profile) => {
    const action = u.active ? 'khóa' : 'mở khóa';
    if (!confirm(`Bạn muốn ${action} tài khoản "${u.fullName}"?`)) return;
    try {
      await toggleUserActive(u.id);
      toast.success(`Đã ${action} tài khoản`);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openDetail = async (id: number) => {
    try {
      setDetailUser(await getUserById(id));
    } catch {
      toast.error('Lỗi tải thông tin');
    }
  };

  const openChangeRole = (u: Profile) => {
    setRoleModalUser(u);
    setCrSelectedRole(null);
  };

  const confirmChangeRole = async () => {
    if (!roleModalUser || !crSelectedRole) return;
    try {
      await changeUserRole(roleModalUser.id, crSelectedRole);
      toast.success('Đã đổi vai trò thành công');
      setRoleModalUser(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Compute taken roles (unique roles: ADMIN/OWNER/MANAGER can have only 1 each)
  const takenRoles = useMemo(() => {
    const m: Record<string, string> = {};
    if (!roleModalUser) return m;
    ['ADMIN', 'OWNER', 'MANAGER'].forEach((r) => {
      const owner = users.find((u) => u.role === r && u.id !== roleModalUser.id);
      if (owner) m[r] = owner.fullName;
    });
    return m;
  }, [users, roleModalUser]);

  return (
    <>
      <div className="section-card">
        <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <h3><i className="fa-solid fa-users" style={{ color: 'var(--primary)' }} /> Quản lý người dùng</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: '#fff' }}
            >
              <option value="">Tất cả vai trò</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Chủ nhà</option>
              <option value="MANAGER">Quản lý</option>
              <option value="TENANT">Người thuê</option>
            </select>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT..."
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, width: 220, background: '#fff' }}
            />
          </div>
        </div>

        {/* Stats pills */}
        <div style={{ display: 'flex', gap: 12, margin: '0 22px 16px', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--bg)', padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
            <span style={{ color: 'var(--text-light)' }}>Tổng:</span> <strong>{stats.total}</strong>
          </div>
          <div style={{ background: 'rgba(46,204,113,.1)', padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
            <span style={{ color: 'var(--text-light)' }}>Hoạt động:</span> <strong style={{ color: '#2ecc71' }}>{stats.active}</strong>
          </div>
          <div style={{ background: 'rgba(231,76,60,.1)', padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
            <span style={{ color: 'var(--text-light)' }}>Đã khóa:</span> <strong style={{ color: '#e74c3c' }}>{stats.locked}</strong>
          </div>
          {Object.entries(stats.roles).map(([r, c]) => (
            <div key={r} style={{ background: 'var(--bg)', padding: '10px 16px', borderRadius: 10, fontSize: 13 }}>
              <span style={{ color: 'var(--text-light)' }}>{ROLE_LABEL[r] || r}:</span> <strong>{c}</strong>
            </div>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Điện thoại</th>
                <th>CCCD</th>
                <th>Ngân hàng</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="loading"><span className="spinner" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9}><div className="empty">Không có dữ liệu</div></td></tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                          ) : initials(u.fullName)}
                        </div>
                        <strong>{u.fullName || '-'}</strong>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{u.email}</td>
                    <td>{u.phone || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                    <td>{u.cccdNumber || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                    <td>
                      {u.bankName && u.bankAccount
                        ? `${u.bankName} · ${u.bankAccount}`
                        : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td><span className={`badge ${ROLE_BADGE_CLASS[u.role] ?? ''}`}>{ROLE_LABEL[u.role] || u.role}</span></td>
                    <td>
                      <span
                        className={`badge ${u.active ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.active ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => openDetail(u.id)}
                          title="Xem chi tiết"
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12, color: 'var(--primary)' }}
                        >
                          <i className="fa-solid fa-eye" />
                        </button>
                        {u.role !== 'ADMIN' && u.role !== 'OWNER' && (
                          <button
                            onClick={() => openChangeRole(u)}
                            title="Đổi vai trò"
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12, color: 'var(--secondary)' }}
                          >
                            <i className="fa-solid fa-user-pen" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User detail modal */}
      <div className={`ud-overlay${detailUser ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setDetailUser(null); }}>
        {detailUser && <UserDetailContent user={detailUser} onClose={() => setDetailUser(null)} onToggleActive={() => { setDetailUser(null); handleToggleActive(detailUser); }} onChangeRole={() => { setDetailUser(null); openChangeRole(detailUser); }} />}
      </div>

      {/* Change role modal */}
      <div className={`ud-overlay${roleModalUser ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setRoleModalUser(null); }}>
        {roleModalUser && (
          <div className="cr-modal">
            <button className="ud-close" onClick={() => setRoleModalUser(null)}><i className="fa-solid fa-xmark" /></button>
            <div className="cr-header">
              <div className="cr-icon"><i className="fa-solid fa-user-shield" /></div>
              <h3 style={{ margin: 0, fontSize: 17 }}>Thay đổi vai trò</h3>
              <p className="cr-sub">{roleModalUser.fullName}</p>
            </div>
            <div className="cr-body">
              <div className="cr-current">
                <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Vai trò hiện tại</span>
                <span className={`badge ${ROLE_BADGE_CLASS[roleModalUser.role] ?? ''}`}>{ROLE_LABEL[roleModalUser.role]}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                <i className="fa-solid fa-arrow-down" /> Chọn vai trò mới
              </div>
              <div className="cr-options">
                {(['ADMIN', 'OWNER', 'MANAGER', 'TENANT'] as UserRole[])
                  .filter((r) => r !== roleModalUser.role)
                  .map((r) => {
                    const taken = takenRoles[r];
                    const isSelected = crSelectedRole === r;
                    return (
                      <div
                        key={r}
                        className={`cr-option${taken ? ' cr-taken' : ''}${isSelected ? ' selected' : ''}`}
                        onClick={() => !taken && setCrSelectedRole(r)}
                        style={{ cursor: taken ? 'not-allowed' : 'pointer' }}
                      >
                        <div className={`cr-option-icon ${r.toLowerCase()}`}>
                          <i className={`fa-solid ${ROLE_ICONS[r]}`} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="cr-option-label">{ROLE_LABEL[r]}</div>
                          <div className="cr-option-desc">
                            {taken ? (
                              <><i className="fa-solid fa-lock" style={{ marginRight: 3 }} /> Đã gán cho <strong>{taken}</strong></>
                            ) : (
                              ROLE_DESCS[r]
                            )}
                          </div>
                        </div>
                        <div className="cr-check">
                          <i className={`fa-solid ${taken ? 'fa-ban' : 'fa-check'}`} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="cr-footer">
              <button className="cr-btn cr-btn-cancel" onClick={() => setRoleModalUser(null)}>Huỷ</button>
              <button className="cr-btn cr-btn-confirm" disabled={!crSelectedRole} onClick={confirmChangeRole}>
                Xác nhận đổi vai trò
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function UserDetailContent({
  user, onClose, onToggleActive, onChangeRole,
}: { user: Profile; onClose: () => void; onToggleActive: () => void; onChangeRole: () => void }) {
  const fields = [
    user.phone, user.cccdNumber, user.cccdFrontUrl,
    user.cccdBackUrl, user.bankAccount, user.bankName,
  ];
  const filledCount = fields.filter(Boolean).length;
  const pct = Math.round((filledCount / fields.length) * 100);
  const pctColor = pct === 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="ud-modal">
      <button className="ud-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
      <div className="ud-header">
        <div className="ud-avatar">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.fullName)}
        </div>
        <div className="ud-name">{user.fullName}</div>
        <div className="ud-badges">
          <span className="ud-badge ud-badge-role">
            <i className="fa-solid fa-shield-halved" /> {ROLE_LABEL[user.role] || user.role}
          </span>
          <span className={`ud-badge ${user.active ? 'ud-badge-active' : 'ud-badge-locked'}`}>
            <i className={`fa-solid ${user.active ? 'fa-circle-check' : 'fa-lock'}`} />{' '}
            {user.active ? 'Hoạt động' : 'Đã khóa'}
          </span>
        </div>
      </div>
      <div className="ud-body">
        <div className="ud-card">
          <div className="ud-card-title"><i className="fa-solid fa-address-book" /> Thông tin liên lạc</div>
          <div className="ud-row">
            <span className="ud-label"><i className="fa-solid fa-envelope" /> Email</span>
            <span className="ud-value">{user.email}</span>
          </div>
          <div className="ud-row">
            <span className="ud-label"><i className="fa-solid fa-phone" /> Điện thoại</span>
            <span className={`ud-value${user.phone ? '' : ' muted'}`}>{user.phone || 'Chưa cập nhật'}</span>
          </div>
        </div>

        <div className="ud-card">
          <div className="ud-card-title"><i className="fa-solid fa-fingerprint" /> Định danh</div>
          <div className="ud-row">
            <span className="ud-label"><i className="fa-solid fa-id-card" /> Số CCCD</span>
            <span className={`ud-value${user.cccdNumber ? '' : ' muted'}`}>{user.cccdNumber || 'Chưa cập nhật'}</span>
          </div>
          {(user.cccdFrontUrl || user.cccdBackUrl) && (
            <div className="ud-cccd-images">
              {user.cccdFrontUrl && (
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>Mặt trước</div>
                  <img src={user.cccdFrontUrl} onClick={() => window.open(user.cccdFrontUrl!, '_blank')} title="Click để phóng to" alt="front" />
                </div>
              )}
              {user.cccdBackUrl && (
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>Mặt sau</div>
                  <img src={user.cccdBackUrl} onClick={() => window.open(user.cccdBackUrl!, '_blank')} title="Click để phóng to" alt="back" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ud-card">
          <div className="ud-card-title"><i className="fa-solid fa-building-columns" /> Tài khoản ngân hàng</div>
          <div className="ud-row">
            <span className="ud-label"><i className="fa-solid fa-landmark" /> Ngân hàng</span>
            <span className={`ud-value${user.bankName ? '' : ' muted'}`}>{user.bankName || 'Chưa cập nhật'}</span>
          </div>
          <div className="ud-row">
            <span className="ud-label"><i className="fa-solid fa-hashtag" /> Số tài khoản</span>
            <span className={`ud-value${user.bankAccount ? '' : ' muted'}`}>{user.bankAccount || 'Chưa cập nhật'}</span>
          </div>
        </div>

        <div className="ud-card">
          <div className="ud-card-title"><i className="fa-solid fa-gear" /> Hệ thống</div>
          <div className="ud-row">
            <span className="ud-label"><i className="fa-solid fa-calendar-plus" /> Ngày tạo</span>
            <span className="ud-value">{user.createdAt ? new Date(user.createdAt).toLocaleString('vi-VN') : '—'}</span>
          </div>
          <div className="ud-row">
            <span className="ud-label"><i className="fa-solid fa-clipboard-check" /> Hoàn thiện hồ sơ</span>
            <span className="ud-value" style={{ color: pctColor }}>{pct}% ({filledCount}/{fields.length})</span>
          </div>
          <div className="ud-progress">
            <div className="ud-progress-bar" style={{ width: `${pct}%`, background: pctColor }} />
          </div>
        </div>

        <div className="ud-actions">
          <button className={`ud-btn ${user.active ? 'ud-btn-lock' : 'ud-btn-unlock'}`} onClick={onToggleActive}>
            <i className={`fa-solid ${user.active ? 'fa-lock' : 'fa-lock-open'}`} /> {user.active ? 'Khóa TK' : 'Mở khóa'}
          </button>
          {user.role !== 'ADMIN' && user.role !== 'OWNER' && (
            <button className="ud-btn ud-btn-role" onClick={onChangeRole}>
              <i className="fa-solid fa-user-pen" /> Đổi vai trò
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

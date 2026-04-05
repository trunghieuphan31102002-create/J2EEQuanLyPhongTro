import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { searchRooms, getOwnerInfo } from '@/api/marketplace';
import { listMyContracts } from '@/api/contracts';
import { applyForRoom } from '@/api/rentalRequests';
import { getMyProfile, updateProfile } from '@/api/profile';
import { uploadImage } from '@/api/upload';
import { getErrorMessage } from '@/api/client';
import { fmtNumber, timeAgo } from '@/lib/format';
import type { RoomListing, OwnerContactInfo } from '@/types/marketplace';
import type { Contract } from '@/types/rental';
import type { Profile } from '@/types/profile';
import BuildingMap from '@/components/BuildingMap';
import './rentalms.css';

// ── Category detection ────────────────────────────────────────────────
type Category = '' | 'phong-tro' | 'nha' | 'can-ho' | 'studio' | 'o-ghep';

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: '',          label: 'Tất cả',           icon: 'fa-border-all' },
  { id: 'phong-tro', label: 'Phòng trọ',        icon: 'fa-door-open' },
  { id: 'nha',       label: 'Nhà nguyên căn',   icon: 'fa-house' },
  { id: 'can-ho',    label: 'Căn hộ',           icon: 'fa-building' },
  { id: 'studio',    label: 'Studio',           icon: 'fa-couch' },
  { id: 'o-ghep',    label: 'Ở ghép',           icon: 'fa-user-group' },
];

function detectCategory(r: RoomListing): Category {
  const txt = `${r.description ?? ''} ${r.amenities ?? ''} ${r.buildingName ?? ''}`.toLowerCase();
  if (txt.includes('nhà nguyên') || txt.includes('nha nguyen')) return 'nha';
  if (txt.includes('căn hộ') || txt.includes('can ho')) return 'can-ho';
  if (txt.includes('studio')) return 'studio';
  if (txt.includes('ở ghép') || txt.includes('o ghep')) return 'o-ghep';
  return 'phong-tro';
}

// Price filter shortcuts
const PRICE_RANGES = [
  { label: 'Tất cả mức giá', min: 0, max: Infinity },
  { label: 'Dưới 1 triệu',   min: 0, max: 1_000_000 },
  { label: '1 – 3 triệu',    min: 1_000_000, max: 3_000_000 },
  { label: '3 – 5 triệu',    min: 3_000_000, max: 5_000_000 },
  { label: '5 – 7 triệu',    min: 5_000_000, max: 7_000_000 },
  { label: '7 – 10 triệu',   min: 7_000_000, max: 10_000_000 },
  { label: 'Trên 10 triệu',  min: 10_000_000, max: Infinity },
];

const AREA_RANGES = [
  { label: 'Tất cả diện tích', min: 0, max: Infinity },
  { label: 'Dưới 20m²',        min: 0, max: 20 },
  { label: '20 – 30m²',        min: 20, max: 30 },
  { label: '30 – 50m²',        min: 30, max: 50 },
  { label: '50 – 70m²',        min: 50, max: 70 },
  { label: 'Trên 70m²',        min: 70, max: Infinity },
];

type Sort = 'newest' | 'price_asc' | 'price_desc';

function splitImages(url: string | null): string[] {
  if (!url) return [];
  return url.split(',').map((s) => s.trim()).filter(Boolean);
}

function fmtPriceShort(p: number): string {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(p % 1_000_000 === 0 ? 0 : 1)} triệu`;
  return fmtNumber(p);
}

// ───────────────────────────────────────────────────────────────────────
export default function RentalMsPage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeContract, setActiveContract] = useState<Contract | null>(null);

  const [keyword, setKeyword] = useState('');
  const [committedKeyword, setCommittedKeyword] = useState('');
  const [category, setCategory] = useState<Category>('');
  const [priceIdx, setPriceIdx] = useState(0);
  const [areaIdx, setAreaIdx] = useState(0);
  const [sort, setSort] = useState<Sort>('newest');

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [detailRoom, setDetailRoom] = useState<RoomListing | null>(null);
  const [showContactOwner, setShowContactOwner] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState<OwnerContactInfo | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const loadRooms = useCallback(async (kw: string) => {
    setLoading(true);
    try {
      setRooms(await searchRooms({ keyword: kw }));
    } catch {
      toast.error('Không tải được danh sách phòng');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadRooms(committedKeyword); }, [committedKeyword, loadRooms]);

  useEffect(() => {
    if (user?.role !== 'TENANT') return;
    listMyContracts()
      .then((list) => {
        const active = list.find((c) => c.status === 'ACTIVE' || c.status === 'EXTENDED');
        if (active) setActiveContract(active);
      })
      .catch(() => { /* non-critical */ });
  }, [user?.role]);

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userDropdownOpen) return;
    const onClick = () => setUserDropdownOpen(false);
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [userDropdownOpen]);

  const filtered = useMemo(() => {
    const price = PRICE_RANGES[priceIdx];
    const area = AREA_RANGES[areaIdx];
    let list = rooms.filter((r) => {
      if (r.price < price.min || r.price > price.max) return false;
      if (r.area != null && (r.area < area.min || r.area > area.max)) return false;
      if (category && detectCategory(r) !== category) return false;
      return true;
    });
    list = [...list];
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
    return list;
  }, [rooms, priceIdx, areaIdx, category, sort]);

  const latestRooms = useMemo(
    () => [...rooms]
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      })
      .slice(0, 3),
    [rooms],
  );

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setCommittedKeyword(keyword);
  };

  const openContactOwner = async (buildingId: number) => {
    setShowContactOwner(true);
    setOwnerInfo(null);
    try {
      setOwnerInfo(await getOwnerInfo(buildingId));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải thông tin chủ nhà'));
    }
  };

  if (!user) return null;
  const initial = (user.fullName || user.email || '?')[0].toUpperCase();
  const roleLabels: Record<string, string> = { ADMIN: 'Quản trị viên', OWNER: 'Chủ trọ', MANAGER: 'Quản lý', TENANT: 'Người thuê' };

  return (
    <div className="rentalms-root">
      {/* HEADER */}
      <header className="header">
        <div className="header-top">
          <Link to="/rentalms" className="logo">
            <div className="logo-box"><i className="fa-solid fa-house-chimney" /></div>
            <div>
              <div className="logo-text">RentalMS</div>
              <div className="logo-sub">Kênh phòng trọ</div>
            </div>
          </Link>

          <form onSubmit={onSearch} className="search-bar">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên tòa nhà, địa chỉ..."
            />
            <button type="submit"><i className="fa-solid fa-magnifying-glass" /> Tìm</button>
          </form>

          <div className="header-right">
            <Link to="/dashboard" className="btn-dashboard">
              <i className="fa-solid fa-gauge-high" /> Dashboard
            </Link>
            <Link to="/notifications" className="notif-btn" title="Thông báo">
              <i className="fa-solid fa-bell" />
            </Link>
            <div
              className={`user-chip${userDropdownOpen ? ' open' : ''}`}
              onClick={(e) => { e.stopPropagation(); setUserDropdownOpen((v) => !v); }}
            >
              <div className="avatar">{initial}</div>
              <div>
                <div className="user-name-chip">{user.fullName}</div>
                <div className="user-role-chip">{roleLabels[user.role]}</div>
              </div>
              <i className="fa-solid fa-chevron-down" style={{ fontSize: 11, color: '#9CA3AF' }} />

              <div className="user-dd" onClick={(e) => e.stopPropagation()}>
                <div className="dd-head">
                  <div className="dd-head-row">
                    <div className="dd-avatar-lg">{initial}</div>
                    <div>
                      <div className="dd-name">{user.fullName}</div>
                      <div className="dd-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="dd-role-badge">
                    <i className="fa-solid fa-shield-halved" /> {roleLabels[user.role]}
                  </div>
                </div>
                <div className="dd-body">
                  <button type="button" className="dd-item" onClick={() => { setShowProfile(true); setUserDropdownOpen(false); }}>
                    <i className="fa-solid fa-user" /> Hồ sơ cá nhân
                  </button>
                  <Link to="/dashboard" className="dd-item">
                    <i className="fa-solid fa-gauge-high" /> Dashboard
                  </Link>
                  <Link to="/notifications" className="dd-item">
                    <i className="fa-solid fa-bell" /> Thông báo
                  </Link>
                  <div className="dd-sep" />
                  <button type="button" className="dd-item red" onClick={() => { logout(); navigate('/login', { replace: true }); }}>
                    <i className="fa-solid fa-right-from-bracket" /> Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORY NAV */}
        <div className="cat-nav">
          <div className="cat-nav-inner">
            {CATEGORIES.map((c) => (
              <button
                key={c.id || 'all'}
                type="button"
                className={`cat-tab${category === c.id ? ' active' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                <i className={`fa-solid ${c.icon}`} /> {c.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/home">RentalMS</Link>
        <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
        <span>{CATEGORIES.find((c) => c.id === category)?.label}</span>
        <i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
        <span>Toàn quốc</span>
      </div>

      {/* MAIN LAYOUT */}
      <div className="wrap">
        <div className="main">
          {/* List header with sort */}
          <div className="list-header">
            <div>
              <div className="list-title">Kênh thông tin phòng trọ RentalMS</div>
              <div className="list-count">
                {loading ? 'Đang tải...' : `Tìm thấy ${filtered.length} phòng`}
              </div>
            </div>
            <div className="sort-row">
              {([
                { id: 'newest',     label: 'Mới nhất' },
                { id: 'price_asc',  label: 'Giá ↑' },
                { id: 'price_desc', label: 'Giá ↓' },
              ] as { id: Sort; label: string }[]).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`sort-btn${sort === s.id ? ' active' : ''}`}
                  onClick={() => setSort(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listings */}
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="sk-card">
                <div className="sk-img skeleton" />
                <div className="sk-body">
                  <div className="skeleton" style={{ height: 16, width: '70%' }} />
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                  <div className="skeleton" style={{ height: 12, width: '100%' }} />
                  <div className="skeleton" style={{ height: 12, width: '80%' }} />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="empty-box">
              <i className="fa-solid fa-house-crack" />
              <h3>Không tìm thấy phòng phù hợp</h3>
              <p>Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            filtered.map((r, idx) => (
              <ListingCard
                key={r.id}
                room={r}
                isVip={idx < 3}
                onClick={() => setDetailRoom(r)}
                onContact={() => openContactOwner(r.buildingId)}
              />
            ))
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="sidebar">
          {activeContract && (
            <div className="cta-card">
              <div className="cta-icon"><i className="fa-solid fa-file-contract" /></div>
              <div className="cta-title">Hợp đồng hiện tại</div>
              <div className="cta-sub">
                {activeContract.buildingName ?? ''} — Phòng {activeContract.roomNo ?? ''}
              </div>
              <div className="cta-rows">
                <div className="cta-row">
                  <span className="cta-label">Trạng thái</span>
                  <span className="cta-value">{activeContract.status}</span>
                </div>
                <div className="cta-row">
                  <span className="cta-label">Đến hạn</span>
                  <span className="cta-value">{activeContract.endDate}</span>
                </div>
              </div>
              <Link to="/dashboard" className="btn-dash">
                <i className="fa-solid fa-arrow-right" /> Xem chi tiết
              </Link>
            </div>
          )}

          {/* Price filter */}
          <div className="widget">
            <div className="widget-head"><i className="fa-solid fa-dollar-sign" /> Khoảng giá</div>
            <div className="filter-links">
              {PRICE_RANGES.map((r, i) => (
                <button
                  key={r.label}
                  type="button"
                  className={`fl${priceIdx === i ? ' active' : ''}`}
                  onClick={() => setPriceIdx(i)}
                >
                  <span><i className="fa-solid fa-angle-right" /> {r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Area filter */}
          <div className="widget">
            <div className="widget-head"><i className="fa-solid fa-expand" /> Diện tích</div>
            <div className="filter-links">
              {AREA_RANGES.map((r, i) => (
                <button
                  key={r.label}
                  type="button"
                  className={`fl${areaIdx === i ? ' active' : ''}`}
                  onClick={() => setAreaIdx(i)}
                >
                  <span><i className="fa-solid fa-angle-right" /> {r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Latest rooms */}
          {latestRooms.length > 0 && (
            <div className="widget">
              <div className="widget-head"><i className="fa-solid fa-clock" /> Tin mới đăng</div>
              <div>
                {latestRooms.map((r) => (
                  <div key={r.id} className="latest-item" onClick={() => setDetailRoom(r)}>
                    <div className="latest-thumb">
                      {splitImages(r.imageUrl)[0] ? (
                        <img src={splitImages(r.imageUrl)[0]} alt="" />
                      ) : (
                        <i className="fa-solid fa-house" />
                      )}
                    </div>
                    <div className="latest-info">
                      <div className="latest-name">
                        {r.roomNo ? `Phòng ${r.roomNo}` : 'Phòng trọ'} — {r.buildingName ?? ''}
                      </div>
                      <div className="latest-price">{fmtPriceShort(r.price)}/tháng</div>
                      <div className="latest-loc">{r.buildingAddress ?? ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Detail modal */}
      {detailRoom && (
        <RoomDetailModal
          room={detailRoom}
          relatedRooms={rooms}
          onClose={() => setDetailRoom(null)}
          onContactOwner={openContactOwner}
          onApplySuccess={() => {
            toast.success('Đã gửi yêu cầu thuê! Chờ chủ nhà duyệt.');
            setDetailRoom(null);
          }}
          onApplyError={(m) => toast.error(m)}
        />
      )}

      {/* Contact owner mini modal */}
      {showContactOwner && (
        <div className="rms-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowContactOwner(false); setOwnerInfo(null); } }}>
          <div className="rms-modal" style={{ maxWidth: 400 }}>
            <div className="rms-modal-head">
              <div className="rms-modal-head-title">Thông tin chủ nhà</div>
              <button className="rms-modal-close" onClick={() => { setShowContactOwner(false); setOwnerInfo(null); }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ padding: 20, textAlign: 'center' }}>
              {!ownerInfo ? (
                <div style={{ padding: 30 }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--green)' }} /></div>
              ) : (
                <>
                  <div className="contact-avatar" style={{ width: 80, height: 80, fontSize: 28, margin: '0 auto 12px', overflow: 'hidden' }}>
                    {ownerInfo.avatarUrl ? <img src={ownerInfo.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (ownerInfo.fullName || 'O')[0].toUpperCase()}
                  </div>
                  <div className="contact-name" style={{ fontSize: 16 }}>{ownerInfo.fullName}</div>
                  <div className="contact-active" style={{ marginBottom: 16 }}>{ownerInfo.buildingName}</div>
                  <div className="building-info-box" style={{ textAlign: 'left' }}>
                    {ownerInfo.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <i className="fa-solid fa-phone" style={{ color: 'var(--green)', width: 20 }} />
                        <a href={`tel:${ownerInfo.phone}`} style={{ color: 'var(--green-d)', fontWeight: 700 }}>{ownerInfo.phone}</a>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <i className="fa-solid fa-envelope" style={{ color: 'var(--green)', width: 20 }} />
                      <a href={`mailto:${ownerInfo.email}`}>{ownerInfo.email}</a>
                    </div>
                    {ownerInfo.buildingAddress && (
                      <div style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
                        <i className="fa-solid fa-location-dot" style={{ color: 'var(--green)', width: 20, marginTop: 3 }} />
                        <span>{ownerInfo.buildingAddress}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}

// ── Listing card ─────────────────────────────────────────────────────
function ListingCard({
  room, isVip, onClick, onContact,
}: {
  room: RoomListing;
  isVip: boolean;
  onClick: () => void;
  onContact: () => void;
}) {
  const images = splitImages(room.imageUrl);
  const firstImg = images[0];
  const mediaCount = images.length + (room.videoUrl ? 1 : 0);

  return (
    <div className="listing-card" onClick={onClick}>
      <div className="listing-inner">
        <div className="listing-img">
          {firstImg ? (
            <img src={firstImg} alt={room.roomNo ?? 'room'} />
          ) : (
            <div className="listing-img-placeholder">
              <i className="fa-solid fa-house" />
            </div>
          )}
          {isVip && <div className="vip-badge">VIP</div>}
          {mediaCount > 0 && (
            <div className="img-count">
              <i className="fa-solid fa-image" /> {mediaCount}
            </div>
          )}
        </div>
        <div className="listing-body">
          <div className="listing-title">
            {room.roomNo ? `Phòng ${room.roomNo} — ` : ''}{room.buildingName ?? 'Phòng trọ'}
          </div>
          <div className="listing-price">
            {fmtPriceShort(room.price)}/tháng
            {room.area != null && (
              <>
                <span className="sep">·</span>
                <span className="area">{room.area}m²</span>
              </>
            )}
          </div>
          <div className="listing-meta">
            {room.beds != null && <span><i className="fa-solid fa-bed" /> {room.beds} giường</span>}
            {room.area != null && <span><i className="fa-solid fa-expand" /> {room.area}m²</span>}
          </div>
          {room.buildingAddress && (
            <div className="listing-loc">
              <i className="fa-solid fa-location-dot" /> {room.buildingAddress}
            </div>
          )}
          {room.amenities && (
            <div className="listing-desc">{room.amenities}</div>
          )}
          <div className="listing-footer">
            <div className="listing-owner">
              <span className="owner-dot" />
              <span className="owner-name">Chủ nhà</span>
              <span className="owner-time">· {timeAgo(room.createdAt)}</span>
            </div>
            <div className="listing-actions">
              <button
                type="button"
                className="btn-call"
                onClick={(e) => { e.stopPropagation(); onContact(); }}
              >
                <i className="fa-solid fa-phone" /> Liên hệ
              </button>
              <button
                type="button"
                className="btn-apply"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
              >
                <i className="fa-solid fa-file-signature" /> Đăng ký
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Room Detail Modal ────────────────────────────────────────────────
function RoomDetailModal({
  room, relatedRooms, onClose, onContactOwner, onApplySuccess, onApplyError,
}: {
  room: RoomListing;
  relatedRooms: RoomListing[];
  onClose: () => void;
  onContactOwner: (buildingId: number) => void;
  onApplySuccess: () => void;
  onApplyError: (m: string) => void;
}) {
  const { user } = useAuth();
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const images = splitImages(room.imageUrl);
  const mediaItems = [...images, ...(room.videoUrl ? [room.videoUrl] : [])];
  const currentMedia = mediaItems[galleryIdx];
  const isVideo = currentMedia && room.videoUrl === currentMedia;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const submitApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      onApplyError('Vui lòng chọn ngày bắt đầu và kết thúc');
      return;
    }
    setSubmitting(true);
    try {
      await applyForRoom({ roomId: room.id, startDate, endDate, note });
      onApplySuccess();
    } catch (err) {
      onApplyError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rms-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rms-modal">
        <div className="rms-modal-head">
          <div className="rms-modal-head-title">
            {room.roomNo ? `Phòng ${room.roomNo}` : 'Chi tiết phòng'} — {room.buildingName ?? ''}
          </div>
          <button className="rms-modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="rms-modal-body">
          <div className="rms-modal-left">
            {/* Gallery */}
            <div className="room-gallery">
              <div className="gallery-main">
                {mediaItems.length === 0 ? (
                  <div className="room-gallery-placeholder"><i className="fa-solid fa-house" /></div>
                ) : isVideo ? (
                  <video src={currentMedia} controls />
                ) : (
                  <img src={currentMedia} alt="" />
                )}
                {mediaItems.length > 1 && (
                  <>
                    <button
                      className="gallery-nav gallery-prev"
                      onClick={() => setGalleryIdx((galleryIdx - 1 + mediaItems.length) % mediaItems.length)}
                    >
                      <i className="fa-solid fa-chevron-left" />
                    </button>
                    <button
                      className="gallery-nav gallery-next"
                      onClick={() => setGalleryIdx((galleryIdx + 1) % mediaItems.length)}
                    >
                      <i className="fa-solid fa-chevron-right" />
                    </button>
                    <div className="gallery-counter">{galleryIdx + 1} / {mediaItems.length}</div>
                  </>
                )}
              </div>
              {mediaItems.length > 1 && (
                <div className="gallery-thumbs">
                  {mediaItems.map((src, i) => (
                    <div
                      key={i}
                      className={`gallery-thumb${i === galleryIdx ? ' active' : ''}`}
                      onClick={() => setGalleryIdx(i)}
                    >
                      {room.videoUrl === src ? (
                        <>
                          <video src={src} />
                          <div className="gallery-vid-badge"><i className="fa-solid fa-play" /></div>
                        </>
                      ) : (
                        <img src={src} alt="" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price + title */}
            <div className="detail-section">
              <div className="detail-price">{fmtPriceShort(room.price)}/tháng</div>
              <div className="detail-title">
                {room.roomNo ? `Phòng ${room.roomNo} — ` : ''}{room.buildingName ?? ''}
              </div>
              <div className="detail-chips">
                <span className="chip chip-green">{room.status === 'AVAILABLE' ? '✓ Còn phòng' : 'Đã thuê'}</span>
                {room.area != null && <span className="chip chip-gray">{room.area}m²</span>}
                {room.beds != null && <span className="chip chip-gray">{room.beds} giường</span>}
              </div>
              <div className="detail-addr">
                <i className="fa-solid fa-location-dot" />
                <span>{room.buildingAddress ?? 'Hồ Chí Minh'}</span>
              </div>
            </div>

            {/* Info grid */}
            <div className="detail-section">
              <div className="info-grid">
                {room.area != null && (
                  <div className="info-item">
                    <div className="info-label">Diện tích</div>
                    <div className="info-value">{room.area}m²</div>
                  </div>
                )}
                {room.beds != null && (
                  <div className="info-item">
                    <div className="info-label">Phòng ngủ</div>
                    <div className="info-value">{room.beds}</div>
                  </div>
                )}
                <div className="info-item">
                  <div className="info-label">Mã phòng</div>
                  <div className="info-value">#{room.id}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Giá / tháng</div>
                  <div className="info-value">{fmtNumber(room.price)}đ</div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            {room.amenities && (
              <div className="detail-section">
                <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Tiện ích</h4>
                <div className="amenity-list">
                  {room.amenities.split(',').map((a, i) => (
                    <span key={i} className="amenity-tag">
                      <i className="fa-solid fa-check" /> {a.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {room.description && (
              <div className="detail-section">
                <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Mô tả</h4>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {room.description}
                </div>
              </div>
            )}

            {/* Building info */}
            {(room.buildingName || room.buildingDescription) && (
              <div className="detail-section">
                <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Về tòa nhà</h4>
                <div className="building-info-box">
                  <div className="building-info-name">{room.buildingName}</div>
                  {room.buildingAddress && (
                    <div className="building-info-addr">
                      <i className="fa-solid fa-location-dot" /> {room.buildingAddress}
                    </div>
                  )}
                  {room.buildingDescription && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8, lineHeight: 1.6 }}>
                      {room.buildingDescription}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map - chi hien khi co GeoJSON polygon */}
            {room.buildingShapeGeoJson && (
              <div className="detail-section">
                <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
                  <i className="fa-solid fa-map-location-dot" style={{ color: '#16a34a', marginRight: 6 }} />
                  Vị trí trên bản đồ
                </h4>
                <BuildingMap
                  shapeGeoJson={room.buildingShapeGeoJson}
                  address={room.buildingAddress}
                  buildingName={room.buildingName}
                  height={280}
                />
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="rms-modal-right">
            <div className="contact-box">
              <div className="contact-owner">
                <div className="contact-avatar">C</div>
                <div>
                  <div className="contact-name">Chủ nhà</div>
                  <div className="contact-active">Đang hoạt động</div>
                </div>
              </div>
              <button type="button" className="btn-green-full" onClick={() => onContactOwner(room.buildingId)}>
                <i className="fa-solid fa-phone" /> Liên hệ chủ nhà
              </button>
              {user?.role === 'TENANT' && (
                <button type="button" className="btn-orange-full" onClick={() => setShowApplyForm(!showApplyForm)}>
                  <i className="fa-solid fa-file-signature" /> {showApplyForm ? 'Ẩn form' : 'Đăng ký thuê'}
                </button>
              )}

              {showApplyForm && user?.role === 'TENANT' && (
                <form className="apply-form" onSubmit={submitApply}>
                  <div className="form-group">
                    <label>Ngày bắt đầu *</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Ngày kết thúc *</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Ghi chú cho chủ nhà</label>
                    <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Tôi muốn xem phòng cuối tuần..." />
                  </div>
                  <button type="submit" className="btn-orange-full" disabled={submitting}>
                    {submitting ? 'Đang gửi...' : (<><i className="fa-solid fa-paper-plane" /> Gửi yêu cầu</>)}
                  </button>
                </form>
              )}
            </div>

            {/* Related rooms */}
            {(() => {
              const related = relatedRooms.filter((r) => r.id !== room.id && r.buildingId === room.buildingId).slice(0, 3);
              if (related.length === 0) return null;
              return (
                <div className="widget">
                  <div className="widget-head"><i className="fa-solid fa-house" /> Phòng cùng tòa</div>
                  <div>
                    {related.map((r) => (
                      <div key={r.id} className="latest-item">
                        <div className="latest-thumb">
                          {splitImages(r.imageUrl)[0] ? (
                            <img src={splitImages(r.imageUrl)[0]} alt="" />
                          ) : (
                            <i className="fa-solid fa-house" />
                          )}
                        </div>
                        <div className="latest-info">
                          <div className="latest-name">Phòng {r.roomNo}</div>
                          <div className="latest-price">{fmtPriceShort(r.price)}/tháng</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile Modal ────────────────────────────────────────────────────
function ProfileModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '', phone: '', cccdNumber: '', bankAccount: '', bankName: '',
    avatarUrl: '', cccdFrontUrl: '', cccdBackUrl: '', zaloLink: '',
  });

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          fullName: p.fullName ?? '', phone: p.phone ?? '', cccdNumber: p.cccdNumber ?? '',
          bankAccount: p.bankAccount ?? '', bankName: p.bankName ?? '',
          avatarUrl: p.avatarUrl ?? '', cccdFrontUrl: p.cccdFrontUrl ?? '',
          cccdBackUrl: p.cccdBackUrl ?? '', zaloLink: p.zaloLink ?? '',
        });
      })
      .catch((err) => toast.error(getErrorMessage(err)));
  }, [toast]);

  const handleUpload = async (field: 'avatarUrl' | 'cccdFrontUrl' | 'cccdBackUrl', file: File | null) => {
    if (!file) return;
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, [field]: url }));
      toast.success('Upload thành công');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload thất bại'));
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success('Đã lưu thông tin');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.fullName || profile?.email || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="profile-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="profile-modal">
        <div className="profile-modal-head">
          <h3>Hồ sơ cá nhân</h3>
          <button className="profile-modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <form onSubmit={save}>
          <div className="profile-modal-body">
            <div className="profile-avatar-wrap">
              <label className="profile-avatar-zone">
                <input type="file" accept="image/*" style={{ display: 'none' }}
                       onChange={(e) => handleUpload('avatarUrl', e.target.files?.[0] ?? null)} />
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="avatar" />
                ) : (
                  <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{initials}</span>
                )}
              </label>
              <div className="profile-avatar-hint">Nhấn để đổi ảnh đại diện</div>
            </div>

            <div className="profile-sec-title">Thông tin cơ bản</div>
            <div className="form-group">
              <label>Họ và tên *</label>
              <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="text" value={profile?.email ?? ''} disabled style={{ background: '#f3f4f6', color: '#9ca3af' }} />
            </div>
            <div className="form-group">
              <label>Số điện thoại</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Zalo link</label>
              <input type="text" value={form.zaloLink} onChange={(e) => setForm({ ...form, zaloLink: e.target.value })} />
            </div>

            <div className="profile-sec-title">CCCD / CMND</div>
            <div className="form-group">
              <label>Số CCCD</label>
              <input type="text" value={form.cccdNumber} onChange={(e) => setForm({ ...form, cccdNumber: e.target.value })} maxLength={20} />
            </div>
            <div className="cccd-row">
              {([['cccdFrontUrl', 'Mặt trước'], ['cccdBackUrl', 'Mặt sau']] as const).map(([field, label]) => (
                <label key={field} className="cccd-zone">
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                         onChange={(e) => handleUpload(field, e.target.files?.[0] ?? null)} />
                  {form[field] ? (
                    <img src={form[field]} alt={label} />
                  ) : (
                    <>
                      <i className="fa-solid fa-id-card" />
                      <div className="cccd-zone-lbl">{label}</div>
                    </>
                  )}
                </label>
              ))}
            </div>

            <div className="profile-sec-title">Tài khoản ngân hàng</div>
            <div className="form-group">
              <label>Số tài khoản</label>
              <input type="text" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tên ngân hàng</label>
              <input type="text" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            </div>
          </div>
          <div className="profile-modal-footer">
            <button type="button" className="btn-outline-full" style={{ width: 'auto', padding: '10px 20px' }} onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-green-full" style={{ width: 'auto', padding: '10px 24px' }} disabled={saving}>
              {saving ? 'Đang lưu...' : (<><i className="fa-solid fa-floppy-disk" /> Lưu thông tin</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

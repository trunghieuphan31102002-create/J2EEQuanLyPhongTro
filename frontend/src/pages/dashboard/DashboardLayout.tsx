import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { countUnread, listNotifications, markAllAsRead, markAsRead } from '@/api/notifications';
import { timeAgo } from '@/lib/format';
import type { UserRole } from '@/types/api';
import type { AppNotification } from '@/types/notification';
import './dashboard.css';

interface MenuItem {
  to: string;
  label: string;
  icon: string;
  roles: UserRole[];
}

const MENU: MenuItem[] = [
  { to: '/dashboard',                   label: 'Tổng quan',       icon: 'fa-gauge-high',          roles: ['ADMIN', 'OWNER', 'MANAGER', 'TENANT'] },
  { to: '/dashboard/buildings',         label: 'Tòa nhà',         icon: 'fa-building',            roles: ['OWNER', 'MANAGER'] },
  { to: '/dashboard/rooms',             label: 'Phòng',           icon: 'fa-door-open',           roles: ['OWNER', 'MANAGER'] },
  { to: '/dashboard/contracts',         label: 'Hợp đồng',        icon: 'fa-file-contract',       roles: ['OWNER', 'MANAGER', 'TENANT'] },
  { to: '/dashboard/bills',             label: 'Hóa đơn',         icon: 'fa-file-invoice-dollar', roles: ['OWNER', 'MANAGER', 'TENANT'] },
  { to: '/dashboard/maintenance',       label: 'Bảo trì',         icon: 'fa-screwdriver-wrench',  roles: ['OWNER', 'MANAGER', 'TENANT'] },
  { to: '/dashboard/rental-requests',   label: 'Yêu cầu thuê',    icon: 'fa-inbox',               roles: ['OWNER'] },
  { to: '/dashboard/my-requests',       label: 'Yêu cầu của tôi', icon: 'fa-clock-rotate-left',   roles: ['TENANT'] },
  { to: '/dashboard/find-room',         label: 'Tìm phòng',       icon: 'fa-magnifying-glass',    roles: ['TENANT'] },
  { to: '/dashboard/users',             label: 'Người dùng',      icon: 'fa-users',               roles: ['ADMIN'] },
  { to: '/dashboard/sys-notify',        label: 'Thông báo HT',    icon: 'fa-bullhorn',            roles: ['ADMIN'] },
  { to: '/dashboard/reports',           label: 'Báo cáo',         icon: 'fa-chart-line',          roles: ['ADMIN'] },
  { to: '/dashboard/audit-logs',        label: 'Nhật ký',         icon: 'fa-clock-rotate-left',   roles: ['ADMIN'] },
];

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Quản trị viên',
  OWNER: 'Chủ trọ',
  MANAGER: 'Quản lý',
  TENANT: 'Người thuê',
};

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  ADMIN: 'badge-admin',
  OWNER: 'badge-owner',
  MANAGER: 'badge-manager',
  TENANT: 'badge-tenant',
};

// Page title derived from current route
const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':                   { title: 'Tổng quan',      subtitle: 'Xem toàn bộ hoạt động' },
  '/dashboard/buildings':         { title: 'Tòa nhà',        subtitle: 'Quản lý các khu tòa nhà của bạn' },
  '/dashboard/rooms':             { title: 'Phòng trọ',      subtitle: 'Quản lý các phòng trọ' },
  '/dashboard/contracts':         { title: 'Hợp đồng',       subtitle: 'Danh sách hợp đồng thuê' },
  '/dashboard/bills':             { title: 'Hóa đơn',        subtitle: 'Quản lý hóa đơn' },
  '/dashboard/maintenance':       { title: 'Bảo trì',        subtitle: 'Yêu cầu sửa chữa' },
  '/dashboard/rental-requests':   { title: 'Yêu cầu thuê',    subtitle: 'Duyệt yêu cầu thuê từ khách hàng' },
  '/dashboard/my-requests':       { title: 'Yêu cầu của tôi', subtitle: 'Theo dõi các yêu cầu thuê bạn đã gửi' },
  '/dashboard/find-room':         { title: 'Tìm phòng',      subtitle: 'Tìm kiếm phòng trọ phù hợp' },
  '/dashboard/users':             { title: 'Người dùng',     subtitle: 'Quản lý tài khoản' },
  '/dashboard/sys-notify':        { title: 'Thông báo hệ thống', subtitle: 'Gửi thông báo broadcast' },
  '/dashboard/reports':           { title: 'Báo cáo',        subtitle: 'Thống kê & phân tích' },
  '/dashboard/audit-logs':        { title: 'Nhật ký hoạt động', subtitle: 'Lịch sử hệ thống' },
  '/dashboard/profile':           { title: 'Hồ sơ cá nhân',  subtitle: 'Thông tin tài khoản' },
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    countUnread().then(setUnread).catch(() => {});
    const id = setInterval(() => countUnread().then(setUnread).catch(() => {}), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (notifOpen) {
      listNotifications().then((list) => setNotifs(list.slice(0, 8))).catch(() => {});
    }
  }, [notifOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const onClick = () => { setNotifOpen(false); setUserOpen(false); };
    if (notifOpen || userOpen) {
      document.addEventListener('click', onClick);
      return () => document.removeEventListener('click', onClick);
    }
  }, [notifOpen, userOpen]);

  if (!user) return null;
  const items = MENU.filter((m) => m.roles.includes(user.role));
  const initial = (user.fullName || user.email || '?')[0].toUpperCase();
  const meta = PAGE_META[location.pathname] ?? { title: 'Dashboard', subtitle: '' };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* noop */ }
  };

  const handleNotifClick = async (n: AppNotification) => {
    if (!n.read) {
      try { await markAsRead(n.id); } catch { /* noop */ }
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
    }
    setNotifOpen(false);
    navigate(`/notifications#notif-${n.id}`);
  };

  const notifIconClass = (type: string) => {
    if (type.startsWith('BILL_')) return type === 'BILL_OVERDUE' ? 'overdue' : 'bill';
    if (type.startsWith('MAINTENANCE_')) return 'maint';
    return 'system';
  };
  const notifIcon = (type: string) => {
    if (type.startsWith('BILL_')) return 'fa-file-invoice-dollar';
    if (type.startsWith('MAINTENANCE_')) return 'fa-screwdriver-wrench';
    if (type.startsWith('RENTAL_REQUEST_')) return 'fa-inbox';
    return 'fa-bullhorn';
  };

  return (
    <div className="dash-root">
      {/* TOP NAVBAR */}
      <nav className="topnav">
        <Link to="/home" className="topnav-logo">
          <div className="logo-icon"><i className="fa-solid fa-house-chimney" /></div>
          <span className="logo-text">Rental<span>MS</span></span>
        </Link>

        <div className="navMenu">
          {items.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === '/dashboard'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <i className={`fa-solid ${m.icon}`} />
              {m.label}
            </NavLink>
          ))}
        </div>

        <div className="topnav-right">
          <Link to="/rentalms" className="btn-back-rental">
            <i className="fa-solid fa-map-location-dot" /> <span>Tìm phòng trọ</span>
          </Link>

          <span className="topnav-username">{user.fullName}</span>
          <span className={`user-role-badge ${ROLE_BADGE_CLASS[user.role]}`}>{ROLE_LABEL[user.role]}</span>

          {/* Notification bell */}
          <div className="notif-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="icon-btn" onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }}>
              <i className="fa-solid fa-bell" />
              {unread > 0 && <span className="notif-count">{unread > 99 ? '99+' : unread}</span>}
            </div>
            <div className={`notif-dropdown${notifOpen ? ' show' : ''}`}>
              <div className="notif-header">
                <h4><i className="fa-solid fa-bell" style={{ color: 'var(--primary)', marginRight: 6 }} />Thông báo</h4>
                <button className="notif-read-all" onClick={handleMarkAllRead}>Đánh dấu tất cả đã đọc</button>
              </div>
              <div className="notif-list">
                {notifs.length === 0 ? (
                  <div className="notif-empty">Không có thông báo</div>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item${n.read ? '' : ' unread'}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className={`notif-icon ${notifIconClass(n.type)}`}>
                        <i className={`fa-solid ${notifIcon(n.type)}`} />
                      </div>
                      <div className="notif-body">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">{timeAgo(n.createdAt)}</div>
                      </div>
                      {!n.read && <div className="notif-unread-dot" />}
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <Link
                  to="/notifications"
                  onClick={() => setNotifOpen(false)}
                  style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}
                >
                  <i className="fa-solid fa-list" /> Xem tất cả thông báo
                </Link>
              </div>
            </div>
          </div>

          {/* User avatar dropdown */}
          <div className="user-dropdown-wrapper" onClick={(e) => e.stopPropagation()}>
            <button className="avatar-btn" onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}>
              {initial}
            </button>
            <div className={`user-dropdown${userOpen ? ' show' : ''}`}>
              <div className="user-dropdown-header">
                <div className="user-dropdown-head-row">
                  <div className="user-dropdown-avatar">{initial}</div>
                  <div>
                    <div className="user-dropdown-name">{user.fullName}</div>
                    <div className="user-dropdown-email">{user.email}</div>
                  </div>
                </div>
                <div className="user-dropdown-role-badge">
                  <i className="fa-solid fa-shield-halved" /> <span>{ROLE_LABEL[user.role]}</span>
                </div>
              </div>
              <div className="user-dropdown-body">
                <Link to="/dashboard/profile" className="user-dropdown-item" onClick={() => setUserOpen(false)}>
                  <i className="fa-solid fa-user" /> Hồ sơ cá nhân
                </Link>
                <Link to="/rentalms" className="user-dropdown-item" onClick={() => setUserOpen(false)}>
                  <i className="fa-solid fa-store" /> Marketplace
                </Link>
                <Link to="/notifications" className="user-dropdown-item" onClick={() => setUserOpen(false)}>
                  <i className="fa-solid fa-bell" /> Tất cả thông báo
                </Link>
                <div className="user-dropdown-divider" />
                <button className="user-dropdown-item danger" onClick={handleLogout}>
                  <i className="fa-solid fa-right-from-bracket" /> Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <div className="page-title">
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

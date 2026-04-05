import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listMyBills, listBillsByContract } from '@/api/bills';
import { listMyContracts } from '@/api/contracts';
import { listMyBuildings, listRoomsInBuilding } from '@/api/buildings';
import { listMyMaintenance } from '@/api/maintenance';
import { listAllUsers, getOverviewReport, listAuditLogs } from '@/api/admin';
import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/types/api';
import { fmtNumber, fmtDate } from '@/lib/format';
import type { Bill } from '@/types/bill';
import type { Contract } from '@/types/rental';
import type { AuditLog } from '@/types/admin';

interface HeroStat { num: string; label: string; icon: string; color: string; cls: string }
interface StatCard { num: string; label: string; icon: string; iconCls: 'orange' | 'green' | 'blue' | 'red'; onClick?: () => void }
interface ChartBar { label: string; count: number; color: string }

export default function OverviewSection() {
  const { user } = useAuth();
  const role = user?.role;
  const [loading, setLoading] = useState(true);
  const [heroEyebrow, setHeroEyebrow] = useState('HỆ THỐNG QUẢN LÝ PHÒNG TRỌ');
  const [heroEyebrowIcon, setHeroEyebrowIcon] = useState('fa-house-chimney');
  const [heroTitle, setHeroTitle] = useState<React.ReactNode>('Quản lý thông minh & hiệu quả');
  const [heroSubtitle, setHeroSubtitle] = useState('Toàn bộ thông tin tòa nhà, phòng, hợp đồng và hóa đơn — trong một nơi duy nhất.');
  const [heroStats, setHeroStats] = useState<HeroStat[]>([]);
  const [statCards, setStatCards] = useState<StatCard[]>([]);
  const [recentTable, setRecentTable] = useState<React.ReactNode>(null);
  const [recentTitle, setRecentTitle] = useState('Hoạt động gần đây');
  const [chartBars, setChartBars] = useState<ChartBar[]>([]);
  const [chartTitle, setChartTitle] = useState('Thống kê tháng');

  useEffect(() => {
    if (!role) return;
    setLoading(true);
    (async () => {
      try {
        if (role === 'ADMIN') await loadAdmin();
        else if (role === 'TENANT') await loadTenant();
        else await loadOwner();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const loadTenant = async () => {
    setHeroEyebrow('PHÒNG TRỌ CỦA TÔI');
    setHeroEyebrowIcon('fa-house-user');
    setHeroTitle(<>Xin chào, <span style={{ color: 'var(--primary)' }}>{user?.fullName}</span></>);
    setHeroSubtitle('Quản lý hợp đồng, hóa đơn và gửi yêu cầu bảo trì dễ dàng.');

    const [bills, maints, ctrs] = await Promise.all([
      listMyBills().catch(() => []),
      listMyMaintenance().catch(() => []),
      listMyContracts().catch(() => []),
    ]);
    const activeContract = ctrs.find((c) => c.status === 'ACTIVE' || c.status === 'EXTENDED');
    const unpaid = bills.filter((b) => b.status === 'UNPAID' || b.status === 'OVERDUE').length;

    setHeroStats([
      { num: activeContract ? '1' : '0', label: 'Hợp đồng',        icon: 'fa-file-contract',          color: 'var(--primary)', cls: 'hs-orange' },
      { num: String(bills.length),        label: 'Hóa đơn',         icon: 'fa-file-invoice-dollar',    color: '#2ecc71',        cls: 'hs-green' },
      { num: String(unpaid),              label: 'Chưa thanh toán', icon: 'fa-triangle-exclamation',   color: '#e74c3c',        cls: 'hs-red' },
      { num: String(maints.length),       label: 'Yêu cầu bảo trì', icon: 'fa-screwdriver-wrench',     color: '#6495ED',        cls: 'hs-blue' },
    ]);

    setStatCards([
      { num: activeContract ? 'Đang thuê' : 'Chưa có', label: 'Hợp đồng của tôi', icon: 'fa-file-contract',        iconCls: 'green' },
      { num: String(bills.length),                      label: 'Hóa đơn',          icon: 'fa-file-invoice-dollar',  iconCls: 'blue' },
      { num: String(unpaid),                            label: 'Chưa thanh toán',  icon: 'fa-triangle-exclamation', iconCls: 'red' },
      { num: String(maints.length),                     label: 'Yêu cầu bảo trì',  icon: 'fa-screwdriver-wrench',   iconCls: 'orange' },
    ]);

    setRecentTitle('Hóa đơn gần đây');
    setRecentTable(renderRecentBills(bills));

    const paid = bills.filter((b) => b.status === 'PAID').length;
    const partial = bills.filter((b) => b.status === 'PARTIAL').length;
    const overdue = bills.filter((b) => b.status === 'OVERDUE').length;
    const unpaidCount = bills.filter((b) => b.status === 'UNPAID').length;
    setChartBars([
      { label: 'Đã TT',   count: paid,        color: '#2ecc71' },
      { label: 'Chưa TT', count: unpaidCount, color: '#3b82f6' },
      { label: 'Một phần', count: partial,   color: '#f59e0b' },
      { label: 'Quá hạn', count: overdue,    color: '#ef4444' },
    ]);
    setChartTitle('Trạng thái hóa đơn');
  };

  const loadOwner = async () => {
    const [buildings, contracts] = await Promise.all([
      listMyBuildings().catch(() => []),
      listMyContracts().catch(() => []),
    ]);
    let totalRooms = 0, occupied = 0;
    for (const b of buildings.slice(0, 5)) {
      try {
        const rooms = await listRoomsInBuilding(b.id);
        totalRooms += rooms.length;
        occupied += rooms.filter((rm) => rm.status === 'OCCUPIED').length;
      } catch { /* skip */ }
    }
    const activeContracts = contracts.filter((c) => c.status === 'ACTIVE' || c.status === 'EXTENDED').length;
    let unpaid = 0;
    for (const c of contracts.filter((x) => x.status === 'ACTIVE').slice(0, 5)) {
      try {
        const bb = await listBillsByContract(c.id);
        unpaid += bb.filter((b) => b.status === 'UNPAID' || b.status === 'OVERDUE').length;
      } catch { /* skip */ }
    }

    setHeroStats([
      { num: String(totalRooms),      label: 'Tổng số phòng',    icon: 'fa-building',             color: 'var(--primary)', cls: 'hs-orange' },
      { num: String(activeContracts), label: 'Hợp đồng hiệu lực', icon: 'fa-file-contract',       color: '#2ecc71',        cls: 'hs-green' },
      { num: String(unpaid),          label: 'Hóa đơn chưa thu',  icon: 'fa-triangle-exclamation', color: '#e74c3c',        cls: 'hs-red' },
      { num: '0',                     label: 'Yêu cầu bảo trì',   icon: 'fa-screwdriver-wrench',   color: '#6495ED',        cls: 'hs-blue' },
    ]);

    setStatCards([
      { num: String(buildings.length),        label: 'Tòa nhà',            icon: 'fa-building',             iconCls: 'orange' },
      { num: `${occupied}/${totalRooms}`,     label: 'Phòng đang cho thuê', icon: 'fa-door-open',           iconCls: 'green' },
      { num: String(activeContracts),         label: 'Hợp đồng hoạt động',  icon: 'fa-file-contract',       iconCls: 'blue' },
      { num: String(unpaid),                  label: 'Hóa đơn chưa thu',    icon: 'fa-triangle-exclamation', iconCls: 'red' },
    ]);

    setRecentTitle('Hợp đồng gần đây');
    setRecentTable(renderRecentContracts(contracts));

    // Random month chart (matches original fallback)
    const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    setChartBars(months.map((m) => ({ label: m, count: Math.floor(Math.random() * 80 + 20), color: '#E8622A' })));
    setChartTitle('Thống kê tháng');
  };

  const loadAdmin = async () => {
    setHeroEyebrow('BẢNG ĐIỀU KHIỂN ADMIN');
    setHeroEyebrowIcon('fa-shield-halved');
    setHeroTitle(<>Quản trị hệ thống <span style={{ color: 'var(--primary)' }}>RentalMS</span></>);
    setHeroSubtitle('Giám sát người dùng, bảo trì, thông báo hệ thống và báo cáo tổng hợp.');

    const [users, report, bugs, logs] = await Promise.all([
      listAllUsers().catch(() => []),
      getOverviewReport().catch(() => ({})),
      apiClient.get<ApiResponse<Array<{ read?: boolean }>>>('/notifications/bug-reports').then((r) => r.data.data ?? []).catch(() => []),
      listAuditLogs({ size: 5 }).catch(() => ({ content: [] as AuditLog[] })),
    ]);
    const activeUsers = users.filter((u) => u.active).length;
    const unreadBugs = (bugs as Array<{ read?: boolean }>).filter((b) => !b.read).length;
    const rep = report as Record<string, unknown>;
    const roomsTotal = ((rep.rooms as { total?: number })?.total) ?? (rep.totalRooms as number) ?? 0;
    const maintenanceCost = rep.maintenanceCost as number | undefined;

    setHeroStats([
      { num: String(users.length),  label: 'Người dùng',      icon: 'fa-users',       color: 'var(--primary)', cls: 'hs-orange' },
      { num: String(activeUsers),   label: 'Đang hoạt động',   icon: 'fa-user-check',  color: '#2ecc71',        cls: 'hs-green' },
      { num: String(unreadBugs),    label: 'Báo lỗi chưa xem', icon: 'fa-bug',         color: '#e74c3c',        cls: 'hs-red' },
      { num: String(roomsTotal),    label: 'Tổng phòng',       icon: 'fa-door-open',   color: '#6495ED',        cls: 'hs-blue' },
    ]);

    setStatCards([
      { num: String(users.length),          label: 'Tổng người dùng',  icon: 'fa-users',                iconCls: 'blue' },
      { num: String(activeUsers),           label: 'Đang hoạt động',    icon: 'fa-user-check',          iconCls: 'green' },
      { num: String(unreadBugs),            label: 'Báo lỗi chưa xem',  icon: 'fa-bug',                 iconCls: 'red' },
      { num: maintenanceCost != null ? fmtNumber(maintenanceCost) : '0', label: 'Chi phí bảo trì (đ)', icon: 'fa-screwdriver-wrench', iconCls: 'orange' },
    ]);

    setRecentTitle('Hoạt động gần đây');
    setRecentTable(renderAuditLogs((logs as { content: AuditLog[] }).content ?? []));

    // User role distribution
    const roleCounts: Record<string, number> = { ADMIN: 0, OWNER: 0, MANAGER: 0, TENANT: 0 };
    users.forEach((u) => { if (roleCounts[u.role] !== undefined) roleCounts[u.role]++; });
    const roleColors: Record<string, string> = { ADMIN: '#ef4444', OWNER: '#f59e0b', MANAGER: '#22c55e', TENANT: '#3b82f6' };
    const roleLabels: Record<string, string> = { ADMIN: 'Admin', OWNER: 'Chủ nhà', MANAGER: 'Quản lý', TENANT: 'Người thuê' };
    setChartBars(Object.entries(roleCounts).map(([r, c]) => ({ label: roleLabels[r], count: c, color: roleColors[r] })));
    setChartTitle('Phân bổ người dùng');
  };

  const maxChart = Math.max(...chartBars.map((c) => c.count), 1);

  return (
    <>
      {/* HERO BANNER */}
      <div className="hero-banner">
        <div className="hero-eyebrow">
          <i className={`fa-solid ${heroEyebrowIcon}`} style={{ marginRight: 6 }} />{heroEyebrow}
        </div>
        <div className="hero-title">{heroTitle}</div>
        <div className="hero-subtitle">{heroSubtitle}</div>
        <div className="hero-stats">
          {heroStats.length === 0 ? (
            // Initial placeholder (4 dashes) matching original
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="hero-stat hs-orange">
                <div className="hs-icon"><i className="fa-solid fa-spinner fa-spin" /></div>
                <div className="hs-num">–</div>
                <div className="hs-label">Đang tải</div>
              </div>
            ))
          ) : (
            heroStats.map((hs, i) => (
              <div key={i} className={`hero-stat ${hs.cls}`}>
                <div className="hs-icon" style={{ color: hs.color }}>
                  <i className={`fa-solid ${hs.icon}`} />
                </div>
                <div className="hs-num">{hs.num}</div>
                <div className="hs-label">{hs.label}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="stats-grid">
        {loading ? (
          <div className="loading" style={{ gridColumn: '1/-1' }}>
            <span className="spinner" />
          </div>
        ) : (
          statCards.map((c, i) => (
            <div key={i} className="stat-card" style={c.onClick ? { cursor: 'pointer' } : undefined} onClick={c.onClick}>
              <div className={`stat-icon ${c.iconCls}`}><i className={`fa-solid ${c.icon}`} /></div>
              <div className="stat-info">
                <div className="num">{c.num}</div>
                <div className="label">{c.label}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* TWO-COL: Recent + Chart */}
      <div className="two-col">
        <div className="section-card">
          <div className="section-head">
            <h3><i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--primary)' }} /> {recentTitle}</h3>
          </div>
          {loading ? (
            <div className="loading"><span className="spinner" /> Đang tải...</div>
          ) : (
            recentTable
          )}
        </div>
        <div className="section-card">
          <div className="section-head">
            <h3><i className="fa-solid fa-chart-bar" style={{ color: 'var(--primary)' }} /> {chartTitle}</h3>
          </div>
          <div style={{ padding: 20 }}>
            <div className="chart-bars">
              {loading ? (
                <div className="loading"><span className="spinner" /></div>
              ) : (
                chartBars.map((b, i) => (
                  <div key={i} className="bar-wrap">
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{b.count}</div>
                    <div
                      className="bar"
                      style={{ height: `${(b.count / maxChart) * 100}%`, background: b.color }}
                      title={`${b.label}: ${b.count}`}
                    />
                    <div className="bar-label">{b.label}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── helpers ──────────────────────────────────────────────────────────

function billBadgeCls(status: string) {
  switch (status) {
    case 'PAID': return 'badge-green';
    case 'UNPAID': return 'badge-orange';
    case 'OVERDUE': return 'badge-red';
    case 'PARTIAL': return 'badge-blue';
    default: return 'badge-gray';
  }
}
function billBadgeLabel(status: string) {
  return ({ PAID: 'Đã trả', UNPAID: 'Chưa trả', OVERDUE: 'Quá hạn', PARTIAL: 'Trả 1 phần', PENDING_CONFIRMATION: 'Chờ xác nhận', CANCELLED: 'Hủy' } as Record<string, string>)[status] ?? status;
}
function contractBadgeCls(status: string) {
  switch (status) {
    case 'ACTIVE':
    case 'EXTENDED': return 'badge-green';
    case 'PENDING': return 'badge-orange';
    case 'TERMINATED': return 'badge-red';
    default: return 'badge-gray';
  }
}
function contractBadgeLabel(status: string) {
  return ({ ACTIVE: 'Hiệu lực', EXTENDED: 'Gia hạn', PENDING: 'Chờ duyệt', TERMINATED: 'Kết thúc', EXPIRED: 'Hết hạn' } as Record<string, string>)[status] ?? status;
}

function renderRecentBills(bills: Bill[]) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Kỳ</th>
            <th>Tổng tiền</th>
            <th>Hạn thanh toán</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {bills.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <div className="empty">
                  <div className="empty-icon">📋</div>
                  Chưa có hóa đơn
                </div>
              </td>
            </tr>
          ) : (
            bills.slice(0, 5).map((b) => (
              <tr key={b.id}>
                <td>{b.period || '-'}</td>
                <td><strong>{fmtNumber(b.totalAmount)}đ</strong></td>
                <td>{fmtDate(b.dueDate)}</td>
                <td><span className={`badge ${billBadgeCls(b.status)}`}>{billBadgeLabel(b.status)}</span></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderRecentContracts(ctrs: Contract[]) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Người thuê</th>
            <th>Bắt đầu</th>
            <th>Kết thúc</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {ctrs.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <div className="empty">
                  <div className="empty-icon">📋</div>
                  Chưa có hợp đồng
                </div>
              </td>
            </tr>
          ) : (
            ctrs.slice(0, 5).map((c) => (
              <tr key={c.id}>
                <td><strong>{c.tenantName || c.tenantId}</strong></td>
                <td>{fmtDate(c.startDate)}</td>
                <td>{fmtDate(c.endDate)}</td>
                <td><span className={`badge ${contractBadgeCls(c.status)}`}>{contractBadgeLabel(c.status)}</span></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderAuditLogs(logs: AuditLog[]) {
  const labels: Record<string, string> = {
    REGISTER: 'Đăng ký', LOGIN: 'Đăng nhập', CREATE: 'Tạo mới', UPDATE: 'Cập nhật',
    DELETE: 'Xoá', PAYMENT: 'Thanh toán', LOCK_USER: 'Khoá TK', UNLOCK_USER: 'Mở khoá',
    CHANGE_ROLE: 'Đổi role', CONFIRM_CASH: 'Xác nhận TT', UPDATE_PROFILE: 'Cập nhật hồ sơ',
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Người dùng</th>
            <th>Hành động</th>
            <th>Mô tả</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <div className="empty">
                  <div className="empty-icon">📋</div>
                  Chưa có hoạt động
                </div>
              </td>
            </tr>
          ) : (
            logs.map((l) => (
              <tr key={l.id}>
                <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  {l.createdAt ? new Date(l.createdAt).toLocaleString('vi-VN') : '-'}
                </td>
                <td style={{ fontSize: 12 }}>{l.actorEmail || 'System'}</td>
                <td><span className="badge" style={{ fontSize: 11 }}>{labels[l.action] || l.action}</span></td>
                <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.description || '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

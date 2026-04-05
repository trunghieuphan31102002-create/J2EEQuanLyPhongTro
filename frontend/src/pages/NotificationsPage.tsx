import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardTopNav from '@/components/DashboardTopNav';
import { useToast } from '@/components/Toast';
import { listNotifications, markAllAsRead, markAsRead } from '@/api/notifications';
import { timeAgo, fmtDateTime } from '@/lib/format';
import type { AppNotification, NotificationType } from '@/types/notification';

type TypeCfg = { cls: string; icon: string; label: string };

const TYPE_CFG: Record<string, TypeCfg> = {
  BILL_ISSUED:                { cls: 'bill',    icon: 'fa-file-invoice-dollar',  label: 'Hóa đơn' },
  BILL_DUE_SOON:              { cls: 'bill',    icon: 'fa-clock',                label: 'Sắp đến hạn' },
  BILL_OVERDUE:               { cls: 'overdue', icon: 'fa-triangle-exclamation', label: 'Quá hạn' },
  BILL_PAID:                  { cls: 'system',  icon: 'fa-circle-check',         label: 'Đã thanh toán' },
  MAINTENANCE_SUBMITTED:      { cls: 'maint',   icon: 'fa-screwdriver-wrench',   label: 'Bảo trì' },
  MAINTENANCE_STATUS_UPDATED: { cls: 'maint',   icon: 'fa-wrench',               label: 'Bảo trì' },
  RENTAL_REQUEST_SUBMITTED:   { cls: 'rental',  icon: 'fa-inbox',                label: 'Yêu cầu thuê' },
  RENTAL_REQUEST_APPROVED:    { cls: 'system',  icon: 'fa-circle-check',         label: 'Yêu cầu thuê' },
  RENTAL_REQUEST_REJECTED:    { cls: 'overdue', icon: 'fa-circle-xmark',         label: 'Yêu cầu thuê' },
  SYSTEM_ANNOUNCEMENT:        { cls: 'system',  icon: 'fa-bullhorn',             label: 'Hệ thống' },
};

const ICON_BG: Record<string, string> = {
  bill:    'bg-blue-100 text-blue-500',
  maint:   'bg-accent-500/10 text-accent-500',
  system:  'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-600',
  rental:  'bg-indigo-100 text-indigo-500',
};

function cfg(type: NotificationType): TypeCfg {
  return TYPE_CFG[type] ?? { cls: 'system', icon: 'fa-info-circle', label: 'Thông báo' };
}

type Filter = 'all' | 'unread' | string; // string = comma-separated types

const FILTERS: { id: Filter; label: string; icon?: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'BILL_ISSUED,BILL_DUE_SOON,BILL_OVERDUE,BILL_PAID', label: 'Hóa đơn', icon: 'fa-file-invoice-dollar' },
  { id: 'MAINTENANCE_SUBMITTED,MAINTENANCE_STATUS_UPDATED', label: 'Bảo trì', icon: 'fa-screwdriver-wrench' },
  { id: 'RENTAL_REQUEST_SUBMITTED,RENTAL_REQUEST_APPROVED,RENTAL_REQUEST_REJECTED', label: 'Yêu cầu thuê', icon: 'fa-inbox' },
  { id: 'SYSTEM_ANNOUNCEMENT', label: 'Hệ thống', icon: 'fa-bullhorn' },
];

export default function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    listNotifications()
      .then(setItems)
      .catch(() => toast.error('Lỗi tải thông báo'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    refresh();
    // Auto-select from URL hash (#notif-123)
    const hash = window.location.hash.replace('#notif-', '');
    if (hash && !Number.isNaN(Number(hash))) setSelectedId(Number(hash));
  }, [refresh]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'unread') return items.filter((n) => !n.read);
    const types = filter.split(',');
    return items.filter((n) => types.includes(n.type));
  }, [items, filter]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);
  const selected = useMemo(() => items.find((n) => n.id === selectedId) ?? null, [items, selectedId]);

  const selectNotif = async (n: AppNotification) => {
    setSelectedId(n.id);
    history.replaceState(null, '', `#notif-${n.id}`);
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      try {
        await markAsRead(n.id);
      } catch {
        // optimistic failure is non-critical
      }
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch {
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 text-ink-700">
      <DashboardTopNav
        title="Thông báo"
        titleIcon="fa-bell"
        right={
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 hover:text-white text-[13px] font-semibold transition"
          >
            <i className="fa-solid fa-arrow-left" /> Quay lại Dashboard
          </Link>
        }
      />

      <main className="pt-16 min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-ink-100 px-8 py-5 flex items-center justify-between">
          <h1 className="text-[22px] font-extrabold flex items-center gap-2.5">
            <i className="fa-solid fa-bell text-accent-500" /> Tất cả thông báo
            {unreadCount > 0 && (
              <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full ml-2">
                {unreadCount}
              </span>
            )}
          </h1>
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border-[1.5px] border-ink-100 text-ink-400 hover:border-accent-500 hover:text-accent-500 text-[13px] font-bold transition"
          >
            <i className="fa-solid fa-check-double" /> Đánh dấu tất cả đã đọc
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 px-8 py-7 max-w-6xl mx-auto">
          {/* List */}
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 flex-wrap mb-5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold border-[1.5px] transition ${
                    filter === f.id
                      ? 'bg-accent-500 border-accent-500 text-white'
                      : 'bg-white border-ink-100 text-ink-400 hover:border-accent-500 hover:text-accent-500'
                  }`}
                >
                  {f.icon && <i className={`fa-solid ${f.icon} mr-1.5`} />} {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-12 text-ink-400">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-accent-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-ink-400">
                <i className="fa-regular fa-bell-slash text-5xl opacity-30 block mb-4" />
                <p>Không có thông báo nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((n) => {
                  const c = cfg(n.type);
                  const bgCls = ICON_BG[c.cls] ?? ICON_BG.system;
                  const isSel = n.id === selectedId;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => selectNotif(n)}
                      className={`w-full text-left bg-white border-[1.5px] rounded-2xl px-5 py-4 flex gap-4 relative transition hover:shadow-card hover:border-accent-400 ${
                        !n.read ? 'bg-orange-50 border-l-4 border-l-accent-500' : 'border-ink-100'
                      } ${isSel ? 'border-accent-500 shadow-[0_0_0_3px_rgba(232,98,42,0.12)]' : ''}`}
                    >
                      <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-xl shrink-0 ${bgCls}`}>
                        <i className={`fa-solid ${c.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-bold mb-1">{n.title}</div>
                        <div className="text-[13px] text-ink-400 leading-[1.5] truncate">{n.message}</div>
                        <div className="text-xs text-ink-400 mt-1.5 flex items-center gap-1.5">
                          <i className="fa-regular fa-clock" /> {timeAgo(n.createdAt)}
                        </div>
                      </div>
                      {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-accent-500 shrink-0 mt-1.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="bg-white border-[1.5px] border-ink-100 rounded-2xl sticky top-[88px] overflow-hidden">
              {!selected ? (
                <div className="p-12 text-center text-ink-400">
                  <i className="fa-regular fa-bell text-4xl opacity-30 block mb-3" />
                  <p>Chọn một thông báo<br />để xem nội dung đầy đủ</p>
                </div>
              ) : (
                <>
                  <div className="px-6 pt-6 pb-4 border-b border-ink-100">
                    <div className="flex items-center gap-3.5 mb-3.5">
                      <div className={`w-14 h-14 rounded-[16px] flex items-center justify-center text-2xl ${ICON_BG[cfg(selected.type).cls] ?? ICON_BG.system}`}>
                        <i className={`fa-solid ${cfg(selected.type).icon}`} />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-ink-50 text-ink-400 uppercase tracking-[0.5px]">
                        {cfg(selected.type).label}
                      </span>
                    </div>
                    <div className="text-xl font-extrabold leading-[1.3]">{selected.title}</div>
                  </div>
                  <div className="px-6 py-5">
                    <div className="text-[15px] leading-[1.75] whitespace-pre-wrap break-words">{selected.message}</div>
                    <div className="mt-4 pt-4 border-t border-ink-100 space-y-2">
                      <div className="flex items-center gap-2 text-[13px] text-ink-400">
                        <i className="fa-regular fa-clock w-4 text-center" /> {fmtDateTime(selected.createdAt)}
                      </div>
                      <div className="flex items-center gap-2 text-[13px] text-ink-400">
                        <i className={`fa-solid fa-circle${selected.read ? '-check text-emerald-600' : ''} w-4 text-center`} />
                        {selected.read ? 'Đã đọc' : 'Chưa đọc'}
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-ink-100 flex gap-2">
                    <Link
                      to="/dashboard"
                      className="flex-1 px-4 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white font-bold text-[13px] text-center flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-solid fa-arrow-left" /> Quay lại Dashboard
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

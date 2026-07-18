import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-700">{title}</h1>
        {subtitle && <p className="text-sm text-ink-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-ink-100 ${className}`}>{children}</div>
  );
}

export function EmptyState({ icon = '📭', message }: { icon?: string; message: string }) {
  return (
    <div className="text-center py-16 text-ink-400">
      <div className="text-5xl mb-4">{icon}</div>
      <p>{message}</p>
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="text-center py-16 text-ink-400">
      <i className="fa-solid fa-spinner fa-spin text-2xl text-accent-500" />
    </div>
  );
}

// ── Status badges ─────────────────────────────────────────────────
export function StatusBadge({ status, kind }: { status: string; kind: 'contract' | 'bill' | 'maint' | 'rental' | 'role' }) {
  const label = LABELS[kind]?.[status] ?? status;
  const cls = CLASSES[kind]?.[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

const LABELS: Record<string, Record<string, string>> = {
  contract: {
    PENDING: 'Chờ duyệt', ACTIVE: 'Hiệu lực', EXTENDED: 'Gia hạn',
    TERMINATED: 'Kết thúc', EXPIRED: 'Hết hạn',
  },
  bill: {
    UNPAID: 'Chưa trả', PARTIAL: 'Trả 1 phần', PAID: 'Đã trả',
    OVERDUE: 'Quá hạn', CANCELLED: 'Hủy',
    PENDING_CONFIRMATION: 'Chờ xác nhận',
  },
  maint: {
    NEW: 'Mới', IN_PROGRESS: 'Đang xử lý', DONE: 'Hoàn thành', CANCELLED: 'Hủy',
  },
  rental: {
    PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Hủy',
  },
  role: {
    ADMIN: 'Admin', OWNER: 'Chủ trọ', MANAGER: 'Quản lý', TENANT: 'Người thuê',
  },
};

const CLASSES: Record<string, Record<string, string>> = {
  contract: {
    PENDING: 'bg-orange-100 text-orange-700',
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    EXTENDED: 'bg-blue-100 text-blue-700',
    TERMINATED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-gray-100 text-gray-600',
  },
  bill: {
    UNPAID: 'bg-orange-100 text-orange-700',
    PARTIAL: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
    PENDING_CONFIRMATION: 'bg-blue-100 text-blue-700',
  },
  maint: {
    NEW: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-orange-100 text-orange-700',
    DONE: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  },
  rental: {
    PENDING: 'bg-orange-100 text-orange-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  },
  role: {
    ADMIN: 'bg-purple-100 text-purple-700',
    OWNER: 'bg-emerald-100 text-emerald-700',
    MANAGER: 'bg-blue-100 text-blue-700',
    TENANT: 'bg-orange-100 text-orange-700',
  },
};

// ── Simple button variants ────────────────────────────────────────
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-bold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed';
  const sizeCls = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  const variantCls = {
    primary:   'bg-accent-500 hover:bg-accent-600 text-white',
    secondary: 'bg-white border border-ink-100 hover:border-accent-500 text-ink-700',
    danger:    'bg-red-500 hover:bg-red-600 text-white',
    ghost:     'hover:bg-ink-50 text-ink-400 hover:text-accent-500',
  }[variant];
  return <button {...props} className={`${base} ${sizeCls} ${variantCls} ${props.className ?? ''}`}>{children}</button>;
}

import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  title?: ReactNode;
  titleIcon?: string;
  right?: ReactNode;
}

export default function DashboardTopNav({ title, titleIcon, right }: Props) {
  const { user } = useAuth();
  const initial = (user?.fullName || user?.email || '?')[0]?.toUpperCase() ?? '?';

  return (
    <nav className="fixed inset-x-0 top-0 h-16 bg-ink-700 flex items-center px-7 z-50 shadow-[0_2px_12px_rgba(0,0,0,0.18)]">
      <Link to="/dashboard" className="flex items-center gap-2.5 no-underline mr-5">
        <div className="w-[38px] h-[38px] rounded-[10px] bg-accent-500 text-white flex items-center justify-center text-base">
          <i className="fa-solid fa-house-chimney" />
        </div>
        <span className="font-display text-xl text-white">
          Rental<span className="text-brand-200">MS</span>
        </span>
      </Link>
      {title && (
        <span className="text-white/75 text-sm font-semibold flex items-center gap-2 before:content-[''] before:w-px before:h-6 before:bg-white/20">
          {titleIcon && <i className={`fa-solid ${titleIcon} ml-2`} />} {title}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2.5">
        {right}
        <div
          className="w-[34px] h-[34px] rounded-full bg-accent-500 border-2 border-white/30 flex items-center justify-center text-white font-bold text-[13px] overflow-hidden"
          title={user?.fullName ?? ''}
        >
          {initial}
        </div>
      </div>
    </nav>
  );
}

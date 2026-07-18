import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface NavLinkItem {
  href: string;
  label: string;
}

interface Props {
  links?: NavLinkItem[];
}

export default function Navbar({ links = [] }: Props) {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-[68px] px-[5%] flex items-center justify-between bg-brand-50/95 backdrop-blur-md border-b border-line">
      <Link to="/" className="flex items-center gap-2.5 no-underline">
        <div className="w-10 h-10 rounded-xl bg-brand-400 text-white flex items-center justify-center text-lg">
          <i className="fa-solid fa-house-chimney" />
        </div>
        <span className="font-display text-[22px] text-brand-800 font-bold">
          Tro<span className="text-brand-400">Tot</span>
        </span>
      </Link>

      {links.length > 0 && (
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-brand-600 font-semibold text-[15px] transition hover:text-brand-400">
              {l.label}
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-500 text-white font-bold text-sm inline-flex items-center gap-1.5"
            >
              <i className="fa-solid fa-gauge-high" /> {user?.fullName}
            </Link>
            <button
              onClick={logout}
              className="px-5 py-2.5 rounded-xl border-2 border-brand-400 text-brand-400 hover:bg-brand-400 hover:text-white font-bold text-sm transition"
            >
              <i className="fa-solid fa-right-from-bracket" />
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl border-2 border-brand-400 text-brand-400 hover:bg-brand-400 hover:text-white font-bold text-sm transition"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-500 text-white font-bold text-sm inline-flex items-center gap-1.5 hover:-translate-y-px hover:shadow-card transition-all"
            >
              <i className="fa-solid fa-user-plus" /> Đăng ký
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

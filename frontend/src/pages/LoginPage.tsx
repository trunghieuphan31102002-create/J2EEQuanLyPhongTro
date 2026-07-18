import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/api/client';

type DemoAccount = { label: string; email: string; password: string };

const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: '👑 Admin',       email: 'admin@rentalms.com',   password: 'admin123' },
  { label: '🏠 Chủ nhà',     email: 'owner@rentalms.com',   password: 'owner123' },
  { label: '👔 Quản lý',     email: 'manager@rentalms.com', password: 'manager123' },
  { label: '👤 Người thuê',  email: 'tenant1@rentalms.com', password: 'tenant123' },
];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: Location } | null)?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  const fillDemo = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await login({ email, password });
      setSuccess('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => navigate(redirectTo, { replace: true }), 600);
    } catch (err) {
      setError(getErrorMessage(err, 'Email hoặc mật khẩu không đúng'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-50">
      <div className="flex w-full max-w-5xl min-h-[600px] rounded-3xl overflow-hidden shadow-card-lg bg-white">
        {/* BANNER */}
        <div className="hidden md:flex flex-1 flex-col justify-center p-12 text-white bg-gradient-to-br from-brand-800 via-brand-700 to-brand-400">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              <i className="fa-solid fa-house-chimney" />
            </div>
            <div className="font-display text-2xl">TroTot</div>
          </div>
          <h2 className="font-display text-[36px] leading-tight mb-4">Chào mừng bạn trở lại!</h2>
          <p className="text-[15px] opacity-80 leading-[1.7] mb-9">
            Đăng nhập để quản lý phòng trọ, theo dõi hóa đơn và kết nối với chủ nhà một cách dễ dàng.
          </p>
          <div className="flex flex-col gap-4 text-sm">
            {[
              { icon: 'fa-shield-halved', text: 'Bảo mật tài khoản với JWT token' },
              { icon: 'fa-bolt',          text: 'Truy cập nhanh mọi tính năng' },
              { icon: 'fa-bell',          text: 'Thông báo hóa đơn & hợp đồng kịp thời' },
            ].map((f) => (
              <div key={f.icon} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <i className={`fa-solid ${f.icon} text-[14px]`} />
                </div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FORM */}
        <div className="flex-1 bg-white p-8 md:p-12 flex flex-col justify-center">
          <h3 className="font-display text-[28px] mb-1.5">Đăng nhập</h3>
          <p className="text-brand-600 text-sm mb-8">Nhập thông tin tài khoản của bạn để tiếp tục</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-100 text-red-700 border border-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-emerald-100 text-emerald-800 border border-emerald-200">
              {success}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            {/* Email */}
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-1.5">Email</label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-3.5 py-3 bg-brand-50 border-[1.5px] border-line rounded-xl text-[15px] text-brand-800 outline-none transition focus:border-brand-400 focus:bg-white focus:shadow-focus"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-1.5">Mật khẩu</label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-300" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-brand-50 border-[1.5px] border-line rounded-xl text-[15px] text-brand-800 outline-none transition focus:border-brand-400 focus:bg-white focus:shadow-focus"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-600 hover:text-brand-800"
                  aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <i className={`fa-regular ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 accent-brand-400"
                />
                Ghi nhớ đăng nhập
              </label>
              <a href="#" className="text-sm font-semibold text-brand-400 hover:underline">
                Quên mật khẩu?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brand-400 hover:bg-brand-500 text-white font-bold text-base flex items-center justify-center gap-2 transition-all hover:-translate-y-px hover:shadow-btn disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" /> Đang đăng nhập...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket" /> Đăng nhập
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5 text-brand-600 text-[13px]">
            <div className="flex-1 h-px bg-line" />
            Tài khoản demo
            <div className="flex-1 h-px bg-line" />
          </div>

          {/* Demo accounts */}
          <div className="bg-brand-50 rounded-xl p-4">
            <h5 className="text-[13px] font-bold text-brand-600 mb-2.5">
              <i className="fa-solid fa-circle-info mr-1" /> Chọn nhanh tài khoản demo:
            </h5>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="px-3 py-1.5 rounded-lg border-[1.5px] border-line bg-white text-xs font-semibold text-brand-800 transition hover:border-brand-400 hover:text-brand-400"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center mt-5 text-sm text-brand-600">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-brand-400 font-bold hover:underline">
              Đăng ký ngay
            </Link>
          </div>
          <div className="text-center mt-2 text-sm text-brand-600">
            <Link to="/" className="text-brand-400 font-bold hover:underline">
              <i className="fa-solid fa-arrow-left mr-1" /> Quay về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

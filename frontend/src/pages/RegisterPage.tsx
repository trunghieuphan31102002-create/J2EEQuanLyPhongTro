import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { register } from '@/api/auth';
import { getErrorMessage } from '@/api/client';
import type { UserRole } from '@/types/api';

type RoleOption = { value: UserRole; emoji: string; name: string; desc: string };

const ROLE_OPTIONS: RoleOption[] = [
  { value: 'OWNER',  emoji: '🏠', name: 'Chủ nhà',    desc: 'Đăng & quản lý phòng' },
  { value: 'TENANT', emoji: '👤', name: 'Người thuê', desc: 'Thuê & quản lý hóa đơn' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [role, setRole]         = useState<UserRole>('OWNER');
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }
    setLoading(true);
    try {
      await register({ fullName, email, phone, password, role });
      setSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(getErrorMessage(err, 'Đăng ký thất bại. Vui lòng thử lại.'));
      setLoading(false);
    }
  };

  const inputCls =
    'w-full pl-10 pr-3.5 py-2.5 bg-brand-50 border-[1.5px] border-line rounded-xl text-sm text-brand-800 outline-none transition focus:border-brand-400 focus:bg-white focus:shadow-focus';

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="flex w-full max-w-5xl min-h-[640px] rounded-3xl overflow-hidden shadow-card-lg bg-white">
        {/* Banner */}
        <div className="hidden md:flex w-[380px] shrink-0 flex-col justify-center p-12 text-white bg-gradient-to-br from-[#5C3520] via-brand-700 to-brand-400">
          <div className="flex items-center gap-3 mb-9">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              <i className="fa-solid fa-house-chimney" />
            </div>
            <div className="font-display text-2xl">TroTot</div>
          </div>
          <h2 className="font-display text-[32px] leading-tight mb-3.5">Tham gia cộng đồng TroTot!</h2>
          <p className="text-sm opacity-80 leading-[1.7] mb-7">
            Đăng ký tài khoản để trải nghiệm hệ thống quản lý phòng trọ thông minh.
          </p>
          <div className="flex flex-col gap-3">
            {[
              { icon: '🏠', title: 'Chủ nhà (Owner)',    desc: 'Đăng phòng, quản lý hợp đồng & thu tiền' },
              { icon: '👤', title: 'Người thuê (Tenant)', desc: 'Tìm phòng, xem hóa đơn & yêu cầu sửa chữa' },
            ].map((c) => (
              <div key={c.title} className="bg-white/10 rounded-xl px-4 py-3.5 flex items-center gap-3">
                <div className="text-[22px]">{c.icon}</div>
                <div>
                  <h5 className="text-sm font-bold mb-0.5">{c.title}</h5>
                  <p className="text-xs opacity-75">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 bg-white p-8 md:p-12 flex flex-col justify-center">
          <h3 className="font-display text-[26px] mb-1.5">Tạo tài khoản mới</h3>
          <p className="text-brand-600 text-sm mb-7">Điền thông tin để bắt đầu sử dụng TroTot</p>

          {error && (
            <div className="mb-3.5 px-4 py-3 rounded-xl text-sm bg-red-100 text-red-700 border border-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3.5 px-4 py-3 rounded-xl text-sm bg-emerald-100 text-emerald-800 border border-emerald-200">
              {success}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold mb-1.5">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-brand-300 text-sm" />
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold mb-1.5">Số điện thoại</label>
                <div className="relative">
                  <i className="fa-solid fa-phone absolute left-3 top-1/2 -translate-y-1/2 text-brand-300 text-sm" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0901234567"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[13px] font-bold mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-brand-300 text-sm" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-[13px] font-bold mb-1.5">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-brand-300 text-sm" />
                  <input
                    type={showPass1 ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className={inputCls + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass1((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-600 hover:text-brand-800"
                  >
                    <i className={`fa-regular ${showPass1 ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold mb-1.5">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-brand-300 text-sm" />
                  <input
                    type={showPass2 ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className={inputCls + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass2((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-600 hover:text-brand-800"
                  >
                    <i className={`fa-regular ${showPass2 ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Role picker */}
            <div className="mt-4">
              <label className="block text-[13px] font-bold mb-1.5">
                Vai trò <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {ROLE_OPTIONS.map((opt) => {
                  const active = role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      className={`border-2 rounded-xl p-3 text-center transition ${
                        active
                          ? 'border-brand-400 bg-brand-400/10'
                          : 'border-line hover:border-brand-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{opt.emoji}</div>
                      <div className="text-[13px] font-bold text-brand-800">{opt.name}</div>
                      <div className="text-[11px] text-brand-600">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-brand-600 text-center mt-4 mb-3">
              Bằng cách đăng ký, bạn đồng ý với{' '}
              <a href="#" className="text-brand-400">Điều khoản dịch vụ</a> và{' '}
              <a href="#" className="text-brand-400">Chính sách bảo mật</a> của TroTot.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-400 hover:bg-brand-500 text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all hover:-translate-y-px hover:shadow-btn disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
            >
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" /> Đang tạo tài khoản...</>
              ) : (
                <><i className="fa-solid fa-user-plus" /> Tạo tài khoản</>
              )}
            </button>
          </form>

          <div className="text-center mt-4 text-sm text-brand-600">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-brand-400 font-bold hover:underline">
              Đăng nhập ngay
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

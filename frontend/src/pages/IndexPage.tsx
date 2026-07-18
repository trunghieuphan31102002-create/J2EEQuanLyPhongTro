import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import LandingFooter from '@/components/LandingFooter';
import RoomCard from '@/components/RoomCard';
import { searchRooms } from '@/api/marketplace';
import { fmtNumber } from '@/lib/format';
import type { RoomListing } from '@/types/marketplace';

type PriceFilter = 'all' | 'cheap' | 'mid' | 'high';

const FEATURES = [
  { icon: '🏡', title: 'Quản lý tòa nhà',    desc: 'Dễ dàng quản lý nhiều tòa nhà, phòng trọ. Cập nhật trạng thái phòng theo thời gian thực.' },
  { icon: '📋', title: 'Hợp đồng điện tử',    desc: 'Tạo và quản lý hợp đồng thuê phòng minh bạch, lưu trữ lịch sử đầy đủ và rõ ràng.' },
  { icon: '💸', title: 'Thanh toán tiện lợi', desc: 'Theo dõi hóa đơn điện, nước, dịch vụ. Thanh toán trực tuyến nhanh chóng, an toàn.' },
  { icon: '🔧', title: 'Bảo trì & sửa chữa', desc: 'Gửi yêu cầu sửa chữa ngay trên ứng dụng. Theo dõi tiến độ xử lý minh bạch.' },
  { icon: '🔔', title: 'Thông báo tự động',  desc: 'Nhắc nhở hóa đơn đến hạn, hợp đồng sắp hết, yêu cầu mới cần xử lý.' },
  { icon: '📊', title: 'Báo cáo & thống kê', desc: 'Tổng hợp doanh thu, công suất cho thuê, chi phí bảo trì một cách trực quan.' },
];

const STEPS = [
  { num: 1, title: 'Tìm kiếm',       desc: 'Duyệt danh sách phòng trống, lọc theo giá, diện tích, địa điểm' },
  { num: 2, title: 'Liên hệ chủ nhà', desc: 'Nhận mã invite từ chủ nhà, đăng ký tài khoản và kết nối' },
  { num: 3, title: 'Ký hợp đồng',     desc: 'Hợp đồng điện tử minh bạch, rõ ràng mọi điều khoản' },
  { num: 4, title: 'Dọn vào ở',        desc: 'Quản lý hóa đơn, báo sửa chữa ngay trên ứng dụng' },
];

export default function IndexPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [filter, setFilter]   = useState<PriceFilter>('all');
  const [query, setQuery]     = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    searchRooms()
      .then((data) => setRooms(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = rooms;
    if (filter === 'cheap') list = list.filter((r) => r.price < 3_000_000);
    else if (filter === 'mid') list = list.filter((r) => r.price >= 3_000_000 && r.price <= 5_000_000);
    else if (filter === 'high') list = list.filter((r) => r.price > 5_000_000);

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          (r.buildingName ?? '').toLowerCase().includes(q) ||
          (r.buildingAddress ?? '').toLowerCase().includes(q) ||
          (r.roomNo ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rooms, filter, searchTerm]);

  const buildingsCount = useMemo(() => new Set(rooms.map((r) => r.buildingId)).size, [rooms]);

  const runSearch = () => {
    setSearchTerm(query);
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
  };

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runSearch();
  };

  return (
    <div className="min-h-screen">
      <Navbar
        links={[
          { href: '#rooms',    label: 'Tìm phòng' },
          { href: '#how',      label: 'Cách dùng' },
          { href: '#features', label: 'Tính năng' },
        ]}
      />

      {/* HERO */}
      <section className="mt-[68px] pt-20 pb-16 px-[5%] flex flex-col md:flex-row items-center gap-12 min-h-[calc(100vh-68px)] bg-gradient-to-br from-brand-50 via-[#FAE8CC] to-[#F5D4AA]">
        <div className="flex-1 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white border-[1.5px] border-line px-4 py-1.5 rounded-full text-[13px] font-semibold text-brand-400 mb-6">
            <i className="fa-solid fa-star text-brand-200" /> Nền tảng thuê phòng uy tín #1
          </div>
          <h1 className="font-display text-[52px] leading-[1.2] mb-5 text-brand-800">
            Tìm phòng trọ <span className="text-brand-400">ưng ý</span>, an tâm sinh sống
          </h1>
          <p className="text-[17px] text-brand-600 leading-[1.7] mb-9">
            Hàng trăm phòng trọ chất lượng, giá tốt. Kết nối trực tiếp với chủ nhà, ký hợp đồng minh bạch, thanh toán tiện lợi.
          </p>

          <div className="bg-white rounded-2xl p-2 flex items-center gap-2 shadow-card border-[1.5px] border-line">
            <i className="fa-solid fa-magnifying-glass text-brand-300 pl-2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onEnter}
              placeholder="Tìm theo tên tòa nhà, địa chỉ..."
              className="flex-1 bg-transparent outline-none px-4 py-2.5 text-[15px] text-brand-800 placeholder:text-[#b0917a]"
            />
            <button
              type="button"
              onClick={runSearch}
              className="px-6 py-3 rounded-xl bg-brand-400 hover:bg-brand-500 text-white font-bold text-sm inline-flex items-center gap-1.5"
            >
              <i className="fa-solid fa-search" /> Tìm kiếm
            </button>
          </div>

          <div className="flex gap-8 mt-8">
            <div className="text-center">
              <div className="text-[28px] font-extrabold text-brand-400">{loading ? '--' : rooms.length}</div>
              <div className="text-[13px] text-brand-600 font-semibold">Phòng trống</div>
            </div>
            <div className="text-center">
              <div className="text-[28px] font-extrabold text-brand-400">{loading ? '--' : buildingsCount}</div>
              <div className="text-[13px] text-brand-600 font-semibold">Tòa nhà</div>
            </div>
            <div className="text-center">
              <div className="text-[28px] font-extrabold text-brand-400">100%</div>
              <div className="text-[13px] text-brand-600 font-semibold">Minh bạch</div>
            </div>
          </div>
        </div>

        {/* Hero card */}
        <div className="flex-1 hidden md:flex justify-center">
          <div className="relative">
            <div className="w-[380px] bg-brand-100 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(61,35,20,0.2)]">
              <div className="h-[220px] flex items-center justify-center text-[80px] bg-gradient-to-br from-brand-300 to-brand-400">
                🏠
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold mb-1">Phòng Studio Hiện Đại</h3>
                <p className="text-[13px] text-brand-600 mb-3">
                  <i className="fa-solid fa-location-dot" /> Quận 1, TP.HCM
                </p>
                <div className="flex gap-4 mb-3 text-[13px] text-brand-600">
                  <span className="flex items-center gap-1"><i className="fa-solid fa-expand" /> 25m²</span>
                  <span className="flex items-center gap-1"><i className="fa-solid fa-bed" /> 1 phòng ngủ</span>
                </div>
                <div className="text-[22px] font-extrabold text-brand-400">
                  {fmtNumber(3500000)}
                  <span className="text-[13px] font-medium text-brand-600">/tháng</span>
                </div>
              </div>
            </div>
            {/* Floating badges */}
            <div className="absolute -bottom-5 -left-10 bg-white rounded-2xl px-4 py-3 shadow-card-lg flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <i className="fa-solid fa-check" />
              </div>
              <div className="text-xs">
                <strong className="block text-sm font-bold">Đã xác minh</strong>Chủ nhà uy tín
              </div>
            </div>
            <div className="absolute top-8 -right-10 bg-white rounded-2xl px-4 py-3 shadow-card-lg flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-brand-400 flex items-center justify-center">
                <i className="fa-solid fa-bolt" />
              </div>
              <div className="text-xs">
                <strong className="block text-sm font-bold">Phản hồi nhanh</strong>Trong 24h
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-[5%] bg-white">
        <div className="text-center mb-14">
          <div className="inline-block bg-brand-400/10 text-brand-400 px-4 py-1.5 rounded-full text-[13px] font-bold mb-3">
            Tính năng nổi bật
          </div>
          <h2 className="font-display text-[38px] mb-3">
            Quản lý phòng trọ <span className="text-brand-400">thông minh</span>
          </h2>
          <p className="text-base text-brand-600 max-w-lg mx-auto">Giải pháp toàn diện cho cả chủ nhà và người thuê</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 max-w-6xl mx-auto">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-9 bg-brand-100 rounded-2xl border-[1.5px] border-line text-center transition hover:-translate-y-1.5 hover:shadow-card-lg hover:border-brand-300"
            >
              <div className="w-16 h-16 mx-auto mb-5 rounded-[18px] bg-brand-400/10 flex items-center justify-center text-[28px]">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2.5">{f.title}</h3>
              <p className="text-sm text-brand-600 leading-[1.6]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROOMS */}
      <section id="rooms" className="py-20 px-[5%] bg-brand-50">
        <div className="text-center mb-14">
          <div className="inline-block bg-brand-400/10 text-brand-400 px-4 py-1.5 rounded-full text-[13px] font-bold mb-3">
            Phòng trống hiện có
          </div>
          <h2 className="font-display text-[38px] mb-3">
            Tìm phòng <span className="text-brand-400">phù hợp</span> với bạn
          </h2>
          <p className="text-base text-brand-600">Danh sách phòng trọ chất lượng, cập nhật liên tục</p>
        </div>

        <div className="flex gap-3 flex-wrap mb-9 max-w-6xl mx-auto">
          {([
            { id: 'all',   label: 'Tất cả' },
            { id: 'cheap', label: 'Dưới 3 triệu' },
            { id: 'mid',   label: '3 - 5 triệu' },
            { id: 'high',  label: 'Trên 5 triệu' },
          ] as { id: PriceFilter; label: string }[]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-5 py-2 rounded-full border-[1.5px] text-sm font-semibold transition ${
                filter === f.id
                  ? 'bg-brand-400 border-brand-400 text-white'
                  : 'bg-white border-line text-brand-600 hover:bg-brand-400 hover:border-brand-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-16 text-brand-600">
              <i className="fa-solid fa-spinner fa-spin text-3xl mr-2 text-brand-400" />
              Đang tải danh sách phòng...
            </div>
          ) : error ? (
            <div className="text-center py-16 text-brand-600">
              <div className="text-5xl mb-4">😔</div>
              <p>Không thể tải danh sách phòng. Vui lòng thử lại.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-brand-600">
              <div className="text-5xl mb-4">🏚️</div>
              <p>Không có phòng trống phù hợp</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((r) => (
                <RoomCard key={r.id} room={r} onClick={() => navigate('/login')} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="py-20 px-[5%] bg-white">
        <div className="text-center mb-14">
          <div className="inline-block bg-brand-400/10 text-brand-400 px-4 py-1.5 rounded-full text-[13px] font-bold mb-3">
            Quy trình đơn giản
          </div>
          <h2 className="font-display text-[38px]">
            Chỉ <span className="text-brand-400">4 bước</span> để có phòng ưng ý
          </h2>
        </div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="hidden md:block absolute top-9 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-brand-400 to-brand-200 z-0" />
          {STEPS.map((s) => (
            <div key={s.num} className="relative z-10 text-center">
              <div className="w-[72px] h-[72px] mx-auto mb-4 rounded-full bg-brand-400 text-white text-[22px] font-extrabold flex items-center justify-center border-4 border-brand-100 shadow-card">
                {s.num}
              </div>
              <h4 className="font-bold mb-2">{s.title}</h4>
              <p className="text-[13px] text-brand-600 leading-[1.6]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-[5%] text-center text-white bg-gradient-to-br from-brand-800 to-[#5C3520]">
        <h2 className="font-display text-[40px] mb-4">Sẵn sàng tìm phòng trọ ưng ý?</h2>
        <p className="text-[17px] opacity-80 mb-9">Đăng ký miễn phí ngay hôm nay và khám phá hàng trăm phòng chất lượng</p>
        <button
          onClick={() => navigate('/register')}
          className="mr-3 px-6 py-3 rounded-xl bg-white text-brand-400 font-bold inline-flex items-center gap-2 hover:bg-brand-200 transition"
        >
          <i className="fa-solid fa-user-plus" /> Đăng ký ngay
        </button>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 rounded-xl border-2 border-white/50 text-white font-bold inline-flex items-center gap-2 hover:bg-white/10 transition"
        >
          <i className="fa-solid fa-right-to-bracket" /> Đăng nhập
        </button>
      </section>

      <LandingFooter />
    </div>
  );
}

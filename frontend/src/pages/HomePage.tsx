import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { searchRooms } from '@/api/marketplace';
import { fmtNumber } from '@/lib/format';
import type { RoomListing } from '@/types/marketplace';
import './HomePage.css';

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
  { num: 1, title: 'Tìm kiếm',        desc: 'Duyệt danh sách phòng trống, lọc theo giá, diện tích, địa điểm' },
  { num: 2, title: 'Liên hệ chủ nhà',  desc: 'Nhận mã invite từ chủ nhà, đăng ký tài khoản và kết nối' },
  { num: 3, title: 'Ký hợp đồng',      desc: 'Hợp đồng điện tử minh bạch, rõ ràng mọi điều khoản' },
  { num: 4, title: 'Dọn vào ở',         desc: 'Quản lý hóa đơn, báo sửa chữa ngay trên ứng dụng' },
];

const EMOJIS = ['🏠', '🏡', '🏢', '🏬', '🛋️', '🏗️'];
const randEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [filter, setFilter] = useState<PriceFilter>('all');
  const [query, setQuery] = useState('');
  const [committed, setCommitted] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const heroCardRef = useRef<HTMLDivElement>(null);
  const heroSceneRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Load rooms
  useEffect(() => {
    searchRooms()
      .then(setRooms)
      .catch(() => setErrored(true))
      .finally(() => setLoading(false));
  }, []);

  // Animated counters
  const [displayRooms, setDisplayRooms] = useState(0);
  const [displayBuildings, setDisplayBuildings] = useState(0);
  useEffect(() => {
    if (loading || rooms.length === 0) return;
    const target = rooms.length;
    const targetBuildings = new Set(rooms.map((r) => r.buildingId)).size;
    const step = Math.ceil(target / 30);
    const stepB = Math.ceil(targetBuildings / 30);
    let cur = 0, curB = 0;
    const id = window.setInterval(() => {
      cur = Math.min(cur + step, target);
      curB = Math.min(curB + stepB, targetBuildings);
      setDisplayRooms(cur);
      setDisplayBuildings(curB);
      if (cur >= target && curB >= targetBuildings) window.clearInterval(id);
    }, 40);
    return () => window.clearInterval(id);
  }, [loading, rooms]);

  // Particles canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const dots = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      a: Math.random() * 0.4 + 0.1,
    }));

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener('resize', resize);

    let rafId = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      dots.forEach((d) => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(134,239,172,${d.a})`;
        ctx.fill();
        d.x += d.dx;
        d.y += d.dy;
        if (d.x < 0 || d.x > W) d.dx *= -1;
        if (d.y < 0 || d.y > H) d.dy *= -1;
      });
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(134,239,172,${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      rafId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Nav scroll shadow
  useEffect(() => {
    const onScroll = () => {
      if (navRef.current) {
        navRef.current.classList.toggle('scrolled', window.scrollY > 20);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible');
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll('.home-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rooms]); // re-observe after rooms render

  // 3D tilt
  const onTilt = (e: ReactMouseEvent<HTMLDivElement>) => {
    const card = heroCardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = (e.clientY - cy) / 18;
    const ry = -(e.clientX - cx) / 18;
    card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  };
  const resetTilt = () => {
    if (heroCardRef.current) heroCardRef.current.style.transform = 'rotateX(0) rotateY(0)';
  };

  const filtered = useMemo(() => {
    let list = rooms;
    if (filter === 'cheap') list = list.filter((r) => r.price < 3_000_000);
    else if (filter === 'mid') list = list.filter((r) => r.price >= 3_000_000 && r.price <= 5_000_000);
    else if (filter === 'high') list = list.filter((r) => r.price > 5_000_000);
    if (committed) {
      const q = committed.toLowerCase();
      list = list.filter(
        (r) =>
          (r.buildingName ?? '').toLowerCase().includes(q) ||
          (r.buildingAddress ?? '').toLowerCase().includes(q) ||
          (r.roomNo ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rooms, filter, committed]);

  const requireAuth = (action: () => void) => {
    if (isAuthenticated) {
      action();
    } else {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      setToastVisible(true);
      toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 2200);
      setShowAuthModal(true);
    }
  };

  const runSearch = () => {
    requireAuth(() => {
      setCommitted(query);
      document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runSearch();
  };

  const onRoomClick = () => requireAuth(() => navigate('/dashboard'));

  return (
    <div className="home-page">
      <canvas id="particles" ref={canvasRef} />

      {/* NAV */}
      <nav ref={navRef} className="home-nav" id="navbar">
        <Link to="/home" className="home-logo">
          <div className="home-logo-icon"><i className="fa-solid fa-house-chimney" /></div>
          <span className="home-logo-text">Tro<span>Tot</span></span>
        </Link>
        <div className="home-nav-links">
          <a href="#rooms">Tìm phòng</a>
          <a href="#features">Tính năng</a>
          <a href="#how">Cách dùng</a>
        </div>
        <div className="home-nav-btns">
          {isAuthenticated ? (
            <Link to="/dashboard" className="home-btn home-btn-primary">
              <i className="fa-solid fa-gauge-high" /> {user?.role === 'ADMIN' ? 'Quản lý & Báo cáo' : 'Dashboard'}
            </Link>
          ) : (
            <>
              <Link to="/login" className="home-btn home-btn-outline">Đăng nhập</Link>
              <Link to="/register" className="home-btn home-btn-primary">
                <i className="fa-solid fa-user-plus" /> Đăng ký
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="home-hero">
        <div className="home-hero-blob home-hero-blob-1" />
        <div className="home-hero-blob home-hero-blob-2" />
        <div className="home-hero-blob home-hero-blob-3" />
        <div className="home-hero-content">
          <div className="home-hero-badge">
            <span className="home-badge-dot" />
            Nền tảng thuê phòng uy tín #1 Việt Nam
          </div>
          <h1>
            Tìm phòng trọ <span className="gradient-text">ưng ý</span>,<br />an tâm sinh sống
          </h1>
          <p className="home-hero-desc">
            Hàng trăm phòng trọ chất lượng, giá tốt. Kết nối trực tiếp với chủ nhà, ký hợp đồng minh bạch, thanh toán tiện lợi.
          </p>

          <div className="home-search-box">
            <i className="fa-solid fa-magnifying-glass" style={{ color: 'rgba(0,0,0,0.35)', paddingLeft: 8 }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onEnter}
              placeholder="Tìm theo tên tòa nhà, địa chỉ..."
            />
            <button className="home-btn home-btn-primary" onClick={runSearch}>
              <i className="fa-solid fa-search" /> Tìm kiếm
            </button>
          </div>

          <div className="home-hero-stats">
            <div className="home-stat">
              <div className="home-stat-num">{loading ? '--' : displayRooms}</div>
              <div className="home-stat-label">Phòng trống</div>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <div className="home-stat-num">{loading ? '--' : displayBuildings}</div>
              <div className="home-stat-label">Tòa nhà</div>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <div className="home-stat-num">100%</div>
              <div className="home-stat-label">Minh bạch</div>
            </div>
          </div>
        </div>

        <div className="home-hero-image">
          <div className="home-card-scene" ref={heroSceneRef} onMouseMove={onTilt} onMouseLeave={resetTilt}>
            <div className="home-card-wrap" ref={heroCardRef}>
              <div className="home-main-card">
                <div className="home-card-img">
                  <div className="home-card-shine" />
                </div>
                <div className="home-card-body">
                  <h3>Phòng Studio Hiện Đại</h3>
                  <p><i className="fa-solid fa-location-dot" /> Quận 1, TP.HCM</p>
                  <div className="home-room-meta" style={{ color: '#6b7280' }}>
                    <span className="home-room-meta-item" style={{ color: '#6b7280' }}>
                      <i className="fa-solid fa-expand" /> 25m²
                    </span>
                    <span className="home-room-meta-item" style={{ color: '#6b7280' }}>
                      <i className="fa-solid fa-bed" /> 1 phòng ngủ
                    </span>
                  </div>
                  <div className="home-card-price">{fmtNumber(3500000)}<span>/tháng</span></div>
                </div>
              </div>
              <div className="home-float-badge home-float-badge-1">
                <div className="home-float-icon green"><i className="fa-solid fa-shield-halved" /></div>
                <div className="home-float-text"><strong>Đã xác minh</strong>Chủ nhà uy tín</div>
              </div>
              <div className="home-float-badge home-float-badge-2">
                <div className="home-float-icon blue"><i className="fa-solid fa-bolt" /></div>
                <div className="home-float-text"><strong>Phản hồi nhanh</strong>Trong 24h</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WAVE */}
      <div className="home-wave">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ height: 60 }}>
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#ffffff" />
        </svg>
      </div>

      {/* FEATURES */}
      <section className="home-features" id="features">
        <div className="home-section-header home-reveal">
          <div className="home-section-tag">✨ Tính năng nổi bật</div>
          <h2>Quản lý phòng trọ <span style={{ color: '#22C55E' }}>thông minh</span></h2>
          <p>Giải pháp toàn diện cho cả chủ nhà và người thuê</p>
        </div>
        <div className="home-features-grid">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`home-feature-card home-reveal home-reveal-delay-${(i % 3) + 1}`}>
              <div className="home-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROOMS */}
      <section className="home-rooms" id="rooms">
        <div className="home-section-header home-reveal">
          <div className="home-section-tag">🏠 Phòng trống hiện có</div>
          <h2>Tìm phòng <span style={{ color: '#22C55E' }}>phù hợp</span> với bạn</h2>
          <p>Danh sách phòng trọ chất lượng, cập nhật liên tục</p>
        </div>
        <div className="home-rooms-filter home-reveal">
          {([
            { id: 'all',   label: '🏘 Tất cả' },
            { id: 'cheap', label: '💰 Dưới 3 triệu' },
            { id: 'mid',   label: '🏠 3 – 5 triệu' },
            { id: 'high',  label: '⭐ Trên 5 triệu' },
          ] as { id: PriceFilter; label: string }[]).map((f) => (
            <button
              key={f.id}
              className={`home-filter-btn${filter === f.id ? ' active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="home-rooms-grid">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, gridColumn: '1/-1' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#22C55E' }} /> Đang tải...
            </div>
          ) : errored ? (
            <div style={{ textAlign: 'center', padding: 60, gridColumn: '1/-1' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>😔</div>
              <p>Không thể tải danh sách phòng.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, gridColumn: '1/-1' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🏚️</div>
              <p>Không có phòng trống phù hợp</p>
            </div>
          ) : (
            filtered.map((r, i) => (
              <div
                key={r.id}
                className={`home-room-card home-reveal`}
                style={{ transitionDelay: `${i * 0.08}s` }}
                onClick={onRoomClick}
              >
                <div className="home-room-img">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.roomNo ?? 'room'} />
                  ) : (
                    <span style={{ position: 'relative', zIndex: 1 }}>{randEmoji()}</span>
                  )}
                  <div className={`home-room-badge${r.status !== 'AVAILABLE' ? ' occupied' : ''}`}>
                    {r.status === 'AVAILABLE' ? '✓ Còn phòng' : 'Đã thuê'}
                  </div>
                </div>
                <div className="home-room-body">
                  <h3>{r.roomNo ? `Phòng ${r.roomNo}` : 'Phòng trọ'}</h3>
                  <div className="home-room-location">
                    <i className="fa-solid fa-location-dot" style={{ color: '#22C55E' }} />
                    {r.buildingName || r.buildingAddress || 'Hồ Chí Minh'}
                  </div>
                  <div className="home-room-meta">
                    {r.area != null && (
                      <span className="home-room-meta-item"><i className="fa-solid fa-expand" /> {r.area}m²</span>
                    )}
                    {r.beds != null && (
                      <span className="home-room-meta-item"><i className="fa-solid fa-bed" /> {r.beds} giường</span>
                    )}
                  </div>
                  {r.amenities && <p style={{ fontSize: 12, color: '#166534', marginBottom: 8 }}>{r.amenities}</p>}
                  <div className="home-room-footer">
                    <div className="home-room-price">{fmtNumber(r.price)}<span>đ/tháng</span></div>
                    <button className="home-btn home-btn-primary home-btn-sm">Xem chi tiết</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* HOW */}
      <section className="home-how" id="how">
        <div className="home-section-header home-reveal">
          <div className="home-section-tag">🚀 Quy trình đơn giản</div>
          <h2>Chỉ <span style={{ color: '#86EFAC' }}>4 bước</span> để có phòng ưng ý</h2>
        </div>
        <div className="home-steps">
          {STEPS.map((s, i) => (
            <div key={s.num} className={`home-step home-reveal home-reveal-delay-${i + 1}`}>
              <div className="home-step-num">{s.num}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="home-cta home-reveal">
        <h2>Sẵn sàng tìm phòng trọ ưng ý?</h2>
        <p>Đăng ký miễn phí ngay hôm nay và khám phá hàng trăm phòng chất lượng</p>
        <Link to="/register" className="home-btn home-btn-white" style={{ marginRight: 12 }}>
          <i className="fa-solid fa-user-plus" /> Đăng ký ngay
        </Link>
        <Link to="/login" className="home-btn home-btn-ghost">
          <i className="fa-solid fa-right-to-bracket" /> Đăng nhập
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="home-footer">
        <div className="home-footer-grid">
          <div className="home-footer-brand">
            <Link to="/home" className="home-logo" style={{ marginBottom: 12, display: 'inline-flex' }}>
              <div className="home-logo-icon"><i className="fa-solid fa-house-chimney" /></div>
              <span className="home-logo-text" style={{ color: '#fff' }}>Tro<span>Tot</span></span>
            </Link>
            <p>Nền tảng quản lý phòng trọ thông minh, kết nối chủ nhà và người thuê một cách minh bạch và tiện lợi.</p>
          </div>
          <div>
            <h4>Dịch vụ</h4>
            <ul>
              <li><a href="#rooms"><i className="fa-solid fa-search" /> Tìm phòng trọ</a></li>
              <li><a href="#"><i className="fa-solid fa-plus" /> Đăng phòng cho thuê</a></li>
              <li><a href="#"><i className="fa-solid fa-file-contract" /> Quản lý hợp đồng</a></li>
              <li><a href="#"><i className="fa-solid fa-credit-card" /> Thanh toán online</a></li>
            </ul>
          </div>
          <div>
            <h4>Hỗ trợ</h4>
            <ul>
              <li><a href="#"><i className="fa-solid fa-book" /> Hướng dẫn sử dụng</a></li>
              <li><a href="#"><i className="fa-solid fa-circle-question" /> FAQ</a></li>
              <li><a href="#"><i className="fa-solid fa-headset" /> Liên hệ</a></li>
              <li><a href="#"><i className="fa-solid fa-shield" /> Chính sách</a></li>
            </ul>
          </div>
          <div>
            <h4>Liên hệ</h4>
            <ul>
              <li><a href="#"><i className="fa-solid fa-envelope" /> support@trotot.vn</a></li>
              <li><a href="#"><i className="fa-solid fa-phone" /> 1800 1234</a></li>
              <li><a href="#"><i className="fa-brands fa-facebook" /> Facebook</a></li>
              <li><a href="#"><i className="fa-brands fa-whatsapp" /> Zalo OA</a></li>
            </ul>
          </div>
        </div>
        <div className="home-footer-bottom">
          <p>© 2026 TroTot. Hệ thống quản lý phòng trọ thông minh.</p>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12, lineHeight: 1.8, opacity: 0.75 }}>
            <strong style={{ color: '#fff' }}>Thành viên nhóm:</strong><br />
            Thái Thiên Thuận — 2280603159 — thuankapa989@gmail.com<br />
            Vũ Mạnh Cường — 2280600364<br />
            Trần Văn Quyến — 2280602687 — quyentrannn1810@gmail.com<br />
            <span style={{ whiteSpace: 'nowrap' }}>Phan Trung Hiếu — 2280619060 — trunghieuphan.31102002@gmail.com</span><br />
            <strong style={{ color: '#fff' }}>GVHD:</strong> Thầy Trịnh Đồng Thạch Trúc
          </div>
        </div>
      </footer>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div
          className="home-auth-modal"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}
        >
          <div className="home-auth-box">
            <div className="home-auth-icon"><i className="fa-solid fa-lock" /></div>
            <h3>Bạn chưa đăng nhập</h3>
            <p>Vui lòng đăng nhập để tiếp tục,<br />hoặc đăng ký nếu chưa có tài khoản.</p>
            <div className="home-auth-btns">
              <Link to="/login" className="home-auth-btn-login">
                <i className="fa-solid fa-right-to-bracket" /> Đăng nhập
              </Link>
              <Link to="/register" className="home-auth-btn-register">
                <i className="fa-solid fa-user-plus" /> Đăng ký
              </Link>
            </div>
            <button className="home-auth-close" onClick={() => setShowAuthModal(false)}>Để sau</button>
          </div>
        </div>
      )}

      {/* Login toast */}
      <div className={`home-login-toast${toastVisible ? ' show' : ''}`}>
        <i className="fa-solid fa-lock" /> Bạn cần đăng nhập cho hành động này
      </div>
    </div>
  );
}

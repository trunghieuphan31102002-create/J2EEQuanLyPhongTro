import { Link } from 'react-router-dom';

export default function LandingFooter() {
  return (
    <footer className="bg-brand-800 text-[#D4B09A] pt-16 pb-8 px-[5%]">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-10 max-w-6xl mx-auto">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-400 text-white flex items-center justify-center text-lg">
              <i className="fa-solid fa-house-chimney" />
            </div>
            <span className="font-display text-[22px] text-white font-bold">
              Tro<span className="text-brand-400">Tot</span>
            </span>
          </Link>
          <p className="text-sm leading-[1.7] opacity-75">
            Nền tảng quản lý phòng trọ thông minh, kết nối chủ nhà và người thuê một cách minh bạch và tiện lợi.
          </p>
        </div>

        {[
          {
            title: 'Dịch vụ',
            items: ['Tìm phòng trọ', 'Đăng phòng cho thuê', 'Quản lý hợp đồng', 'Thanh toán online'],
          },
          {
            title: 'Hỗ trợ',
            items: ['Hướng dẫn sử dụng', 'FAQ', 'Liên hệ', 'Chính sách'],
          },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="text-white text-[15px] font-bold mb-4">{col.title}</h4>
            <ul className="space-y-2.5">
              {col.items.map((it) => (
                <li key={it}>
                  <a href="#" className="text-sm opacity-75 hover:opacity-100 hover:text-brand-200 transition">
                    {it}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4 className="text-white text-[15px] font-bold mb-4">Liên hệ</h4>
          <ul className="space-y-2.5 text-sm opacity-75">
            <li><i className="fa-solid fa-envelope mr-2" />support@trotot.vn</li>
            <li><i className="fa-solid fa-phone mr-2" />1800 1234</li>
            <li><i className="fa-brands fa-facebook mr-2" />Facebook</li>
            <li><i className="fa-brands fa-whatsapp mr-2" />Zalo OA</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 pt-6 text-center text-[13px] opacity-50 max-w-6xl mx-auto">
        <p>© 2026 TroTot. Hệ thống quản lý phòng trọ thông minh.</p>
        <div className="mt-4 pt-4 border-t border-white/5 text-xs leading-[1.8] opacity-90">
          <strong className="text-white">Thành viên nhóm:</strong>
          <br />
          Thái Thiên Thuận — 2280603159 — thuankapa989@gmail.com
          <br />
          Vũ Mạnh Cường — 2280600364
          <br />
          Trần Văn Quyến — 2280602687 — quyentrannn1810@gmail.com
          <br />
          <span className="whitespace-nowrap">Phan Trung Hiếu — 2280619060 — trunghieuphan.31102002@gmail.com</span>
          <br />
          <strong className="text-white">GVHD:</strong> Thầy Trịnh Đồng Thạch Trúc
        </div>
      </div>
    </footer>
  );
}

import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-card p-8">
        <h1 className="font-display text-3xl mb-2">Dashboard</h1>
        <p className="text-brand-600 mb-6">
          Xin chào <b>{user?.fullName}</b> ({user?.role})
        </p>
        <p className="text-sm text-brand-600 mb-6">
          Đây là placeholder — các trang còn lại (buildings, rooms, contracts, bills...) sẽ được migrate dần.
        </p>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-brand-400 hover:bg-brand-500 text-white font-semibold"
        >
          <i className="fa-solid fa-right-from-bracket mr-2" />Đăng xuất
        </button>
      </div>
    </div>
  );
}

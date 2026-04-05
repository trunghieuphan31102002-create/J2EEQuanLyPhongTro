import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/Toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import HomePage from '@/pages/HomePage';
import NotificationsPage from '@/pages/NotificationsPage';
import RentalMsPage from '@/pages/RentalMsPage';
import PaymentResultPage from '@/pages/PaymentResultPage';
import DashboardLayout from '@/pages/dashboard/DashboardLayout';
import OverviewSection      from '@/pages/dashboard/sections/OverviewSection';
import BuildingsSection     from '@/pages/dashboard/sections/BuildingsSection';
import RoomsSection         from '@/pages/dashboard/sections/RoomsSection';
import ContractsSection     from '@/pages/dashboard/sections/ContractsSection';
import BillsSection         from '@/pages/dashboard/sections/BillsSection';
import MaintenanceSection   from '@/pages/dashboard/sections/MaintenanceSection';
import RentalRequestsSection from '@/pages/dashboard/sections/RentalRequestsSection';
import MyRequestsSection    from '@/pages/dashboard/sections/MyRequestsSection';
import FindRoomSection      from '@/pages/dashboard/sections/FindRoomSection';
import UsersSection         from '@/pages/dashboard/sections/UsersSection';
import SysNotifySection     from '@/pages/dashboard/sections/SysNotifySection';
import ReportsSection       from '@/pages/dashboard/sections/ReportsSection';
import AuditLogsSection     from '@/pages/dashboard/sections/AuditLogsSection';
import ProfileSection       from '@/pages/dashboard/sections/ProfileSection';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/"         element={<Navigate to="/home" replace />} />
            <Route path="/home"     element={<HomePage />} />
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/payment/result" element={<PaymentResultPage />} />
            <Route
              path="/rentalms"
              element={
                <ProtectedRoute>
                  <RentalMsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index                   element={<OverviewSection />} />
              <Route path="buildings"        element={<BuildingsSection />} />
              <Route path="rooms"            element={<RoomsSection />} />
              <Route path="contracts"        element={<ContractsSection />} />
              <Route path="bills"            element={<BillsSection />} />
              <Route path="maintenance"      element={<MaintenanceSection />} />
              <Route path="rental-requests"  element={<RentalRequestsSection />} />
              <Route path="my-requests"      element={<MyRequestsSection />} />
              <Route path="find-room"        element={<FindRoomSection />} />
              <Route path="users"            element={<UsersSection />} />
              <Route path="sys-notify"       element={<SysNotifySection />} />
              <Route path="reports"          element={<ReportsSection />} />
              <Route path="audit-logs"       element={<AuditLogsSection />} />
              <Route path="profile"          element={<ProfileSection />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

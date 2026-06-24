import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useSocketConnection } from './hooks/useSocket';
import { notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { Center, Loader } from '@mantine/core';

// Error Boundary
import ErrorBoundary from './components/ErrorBoundary';

// Layouts (Keep layouts eager loaded as they wrap everything)
import AdminLayout from './components/layout/AdminLayout';
import TeknisiLayout from './components/layout/TeknisiLayout';

// Lazy Loaded Pages
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const ManajemenDokumen = React.lazy(() => import('./pages/admin/ManajemenDokumen'));
const ApprovalQueue = React.lazy(() => import('./pages/admin/ApprovalQueue'));
const MasterInventaris = React.lazy(() => import('./pages/admin/MasterInventaris'));
const ManajemenUser = React.lazy(() => import('./pages/admin/ManajemenUser'));
const TelegramSettings = React.lazy(() => import('./pages/admin/TelegramSettings'));
const TelegramLogs = React.lazy(() => import('./pages/admin/TelegramLogs'));
const SystemSettings = React.lazy(() => import('./pages/admin/SystemSettings'));

const TeknisiDashboard = React.lazy(() => import('./pages/teknisi/TeknisiDashboard'));
const DaftarTugas = React.lazy(() => import('./pages/teknisi/DaftarTugas'));
const DetailTugas = React.lazy(() => import('./pages/teknisi/DetailTugas'));
const UploadEvidence = React.lazy(() => import('./pages/teknisi/UploadEvidence'));
const KatalogInventaris = React.lazy(() => import('./pages/teknisi/KatalogInventaris'));
const FormRequestBarang = React.lazy(() => import('./pages/teknisi/FormRequestBarang'));
const RiwayatPermintaan = React.lazy(() => import('./pages/teknisi/RiwayatPermintaan'));
const NotificationCenter = React.lazy(() => import('./pages/teknisi/NotificationCenter'));
const ProfilPage = React.lazy(() => import('./pages/teknisi/ProfilPage'));


const PublicBoard = React.lazy(() => import('./pages/public/PublicBoard'));

// Route guard
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectByRole() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'teknisi') return <Navigate to="/teknisi" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'superadmin') return <Navigate to="/superadmin" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  const { checkAuth, isLoading } = useAuthStore();
  const socket = useSocketConnection();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: any) => {
      // Don't show toasts once logged out (socket may emit a final event during logout)
      if (!useAuthStore.getState().isAuthenticated) return;
      notifications.show({
        title: data.title,
        message: data.message,
        color: data.type?.includes('reject') ? 'red' : 'blue',
        position: 'top-center',
      });
    };

    const handleNewActivity = (data: any) => {
      // Don't show toasts once logged out
      if (!useAuthStore.getState().isAuthenticated) return;
      // Sembunyikan live notification ini jika yang sedang login adalah Teknisi
      if (useAuthStore.getState().user?.role === 'teknisi') return;

      notifications.show({
        title: 'Aktivitas Baru',
        message: data.description || `${data.user} melakukan ${data.action} pada ${data.entity_type}`,
        color: 'gray',
        autoClose: 3000,
        position: 'top-center',
      });
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('activity:new', handleNewActivity);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('activity:new', handleNewActivity);
    };
  }, [socket]);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  // Fallback for lazy loading
  const pageFallback = (
    <Center h="100vh">
      <Loader size="md" variant="dots" />
    </Center>
  );

  return (
    <ErrorBoundary>
      <ModalsProvider>
        <Suspense fallback={pageFallback}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/public/board" element={<PublicBoard />} />
            <Route path="/board" element={<PublicBoard />} />
            <Route path="/" element={<RedirectByRole />} />

            {/* ─── TEKNISI ROUTES (Mobile-First) ─── */}
            <Route
              path="/teknisi"
              element={
                <ProtectedRoute allowedRoles={['teknisi']}>
                  <TeknisiLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<TeknisiDashboard />} />
              <Route path="dokumen" element={<DaftarTugas />} />
              <Route path="dokumen/:id" element={<DetailTugas />} />
              <Route path="dokumen/:id/upload" element={<UploadEvidence />} />
              <Route path="inventaris" element={<KatalogInventaris />} />
              <Route path="inventaris/request" element={<FormRequestBarang />} />
              <Route path="inventaris/history" element={<RiwayatPermintaan />} />
              <Route path="notifikasi" element={<NotificationCenter />} />
              <Route path="profil" element={<ProfilPage />} />
            </Route>

            {/* ─── ADMIN ROUTES (Desktop-First) ─── */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="dokumen" element={<ManajemenDokumen />} />
              <Route path="approvals" element={<ApprovalQueue />} />
              <Route path="inventaris" element={<MasterInventaris />} />
              <Route path="inventaris/requests" element={<ApprovalQueue />} />
              <Route path="users" element={<ManajemenUser />} />
              <Route path="telegram-settings" element={<TelegramSettings />} />
              <Route path="telegram-logs" element={<TelegramLogs />} />
              <Route path="notifikasi" element={<NotificationCenter />} />
              <Route path="profil" element={<ProfilPage />} />
            </Route>

            {/* ─── SUPERADMIN ROUTES (Desktop-First) ─── */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="dokumen" element={<ManajemenDokumen />} />
              <Route path="approvals" element={<ApprovalQueue />} />
              <Route path="inventaris" element={<MasterInventaris />} />
              <Route path="inventaris/requests" element={<ApprovalQueue />} />
              <Route path="users" element={<ManajemenUser />} />
              <Route path="telegram-settings" element={<TelegramSettings />} />
              <Route path="telegram-logs" element={<TelegramLogs />} />
              <Route path="settings" element={<SystemSettings />} />
              <Route path="notifikasi" element={<NotificationCenter />} />
              <Route path="profil" element={<ProfilPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ModalsProvider>
    </ErrorBoundary>
  );
}

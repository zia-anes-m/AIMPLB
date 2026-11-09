import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { Logo } from '@/components/common/Logo';

// Statically imported critical public entry pages to ensure instant, reliable loading on mobile devices
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Lazily loaded department modules
const InviteeListPage = lazy(() => import('@/pages/invitees/InviteeListPage').then((m) => ({ default: m.InviteeListPage })));
const InviteeDetailPage = lazy(() => import('@/pages/invitees/InviteeDetailPage').then((m) => ({ default: m.InviteeDetailPage })));
const TransportationDashboard = lazy(() => import('@/pages/transportation/TransportationDashboard').then((m) => ({ default: m.TransportationDashboard })));
const AccommodationDashboard = lazy(() => import('@/pages/accommodation/AccommodationDashboard').then((m) => ({ default: m.AccommodationDashboard })));
const FoodDashboard = lazy(() => import('@/pages/food/FoodDashboard').then((m) => ({ default: m.FoodDashboard })));
const ReceptionDashboard = lazy(() => import('@/pages/reception/ReceptionDashboard').then((m) => ({ default: m.ReceptionDashboard })));
const MeetingHallDashboard = lazy(() => import('@/pages/meeting-hall/MeetingHallDashboard').then((m) => ({ default: m.MeetingHallDashboard })));

// Admin Modules
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const VolunteerManagement = lazy(() => import('@/pages/admin/VolunteerManagement').then((m) => ({ default: m.VolunteerManagement })));
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const AuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const SystemSettingsPage = lazy(() => import('@/pages/admin/SystemSettingsPage').then((m) => ({ default: m.SystemSettingsPage })));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F5] p-6 text-center select-none">
          <Logo size="lg" className="h-14 w-14 mb-3 animate-pulse" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#164734]">
            All India Muslim Personal Law Board
          </p>
          <p className="text-[11px] text-[#69756F] mt-0.5">30th Annual Session • Loading Portal...</p>
        </div>
      }
    >
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Department Operations Inside AppLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Centralized Invitee Module */}
          <Route path="/invitees" element={<InviteeListPage />} />
          <Route path="/invitees/:id" element={<InviteeDetailPage />} />

          {/* Transportation */}
          <Route
            path="/transportation"
            element={
              <ProtectedRoute allowedRoles={['Transportation Team', 'Admin']}>
                <TransportationDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transportation/dashboard"
            element={<Navigate to="/transportation" replace />}
          />

          {/* Accommodation */}
          <Route
            path="/accommodation"
            element={
              <ProtectedRoute allowedRoles={['Accommodation Team', 'Admin']}>
                <AccommodationDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accommodation/dashboard"
            element={<Navigate to="/accommodation" replace />}
          />

          {/* Food */}
          <Route
            path="/food"
            element={
              <ProtectedRoute allowedRoles={['Food Team', 'Admin']}>
                <FoodDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/food/dashboard"
            element={<Navigate to="/food" replace />}
          />

          {/* Reception */}
          <Route
            path="/reception"
            element={
              <ProtectedRoute allowedRoles={['Reception Team', 'Admin']}>
                <ReceptionDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reception/dashboard"
            element={<Navigate to="/reception" replace />}
          />

          {/* Meeting Hall */}
          <Route
            path="/meeting-hall"
            element={
              <ProtectedRoute allowedRoles={['Meeting Hall Team', 'Admin']}>
                <MeetingHallDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meeting-hall/dashboard"
            element={<Navigate to="/meeting-hall" replace />}
          />

          {/* Admin Modules */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={<Navigate to="/admin" replace />}
          />
          <Route
            path="/admin/volunteers"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <VolunteerManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <SystemSettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

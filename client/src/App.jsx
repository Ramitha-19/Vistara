import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterVisitPage from './pages/RegisterVisitPage';
import VisitorStatusPage from './pages/VisitorStatusPage';
import SecurityDashboard from './pages/SecurityDashboard';
import ReceptionDashboard from './pages/ReceptionDashboard';
import StaffDashboard from './pages/StaffDashboard';
import HRDashboard from './pages/HRDashboard';
import AdminDashboard from './pages/AdminDashboard';
import QRScannerPage from './pages/QRScannerPage';
import ActiveVisitorsPage from './pages/ActiveVisitorsPage';
import OverstayAlertsPage from './pages/OverstayAlertsPage';
import VisitorHistoryPage from './pages/VisitorHistoryPage';
import UserManagementPage from './pages/UserManagementPage';
import NotificationsPage from './pages/NotificationsPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import NotFoundPage from './pages/NotFoundPage';

// Guard
import ProtectedRoute from './components/ProtectedRoute';

// Dynamic role redirector
function RoleDashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'security') return <Navigate to="/security" replace />;
  if (user.role === 'receptionist') return <Navigate to="/reception" replace />;
  if (user.role === 'staff' || user.role === 'host') return <Navigate to="/staff" replace />;
  if (user.role === 'hr') return <Navigate to="/hr" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Portals */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register-visit" element={<RegisterVisitPage />} />
          <Route path="/status" element={<VisitorStatusPage />} />
          <Route path="/dashboard" element={<RoleDashboardRedirect />} />

          {/* 1. Security Guard Dashboard (Highest Priority) */}
          <Route
            path="/security"
            element={
              <ProtectedRoute allowedRoles={['security', 'admin', 'receptionist']}>
                <SecurityDashboard />
              </ProtectedRoute>
            }
          />

          {/* 2. Receptionist Dashboard */}
          <Route
            path="/reception"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                <ReceptionDashboard />
              </ProtectedRoute>
            }
          />

          {/* 3. Staff / Host Dashboard */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['staff', 'host', 'admin']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host"
            element={<Navigate to="/staff" replace />}
          />

          {/* 4. HR Dashboard */}
          <Route
            path="/hr"
            element={
              <ProtectedRoute allowedRoles={['hr', 'admin']}>
                <HRDashboard />
              </ProtectedRoute>
            }
          />

          {/* 5. Administrator Overview */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />

          {/* Shared Utility Workspaces */}
          <Route
            path="/scanner"
            element={
              <ProtectedRoute allowedRoles={['security', 'receptionist', 'admin']}>
                <SecurityDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/overstays"
            element={
              <ProtectedRoute allowedRoles={['security', 'receptionist', 'admin', 'staff', 'hr']}>
                <OverstayAlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/active-visitors"
            element={
              <ProtectedRoute allowedRoles={['security', 'receptionist', 'admin', 'staff', 'hr']}>
                <ActiveVisitorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Navigate to="/admin" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['security', 'receptionist', 'admin', 'staff', 'hr']}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Security & Fallback Pages */}
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

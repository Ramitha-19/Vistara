import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import {
  ShieldCheck,
  LayoutDashboard,
  QrCode,
  Users,
  Clock,
  History,
  UserCheck,
  Bell,
  Sun,
  Moon,
  LogOut,
  ScanLine,
  FileText,
  AlertTriangle,
  Briefcase,
} from 'lucide-react';
import '../styles/dashboard.css';

export default function Layout({ children, title, subtitle }) {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activeOverstaysCount, setActiveOverstaysCount] = useState(0);

  useEffect(() => {
    fetchHeaderAlerts();
    const interval = setInterval(fetchHeaderAlerts, 20000);
    return () => clearInterval(interval);
  }, []);

  const fetchHeaderAlerts = async () => {
    try {
      const notifData = await apiRequest('/system/notifications');
      if (notifData) setUnreadNotifications(notifData.unreadCount || 0);

      const overstayData = await apiRequest('/visits/overstays');
      if (overstayData) setActiveOverstaysCount(overstayData.count || 0);
    } catch (e) {
      // Polling catch
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user ? user.role : '';

  return (
    <div className="app-layout">
      {/* ---------------- Sidebar Navigation ---------------- */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="brand-icon-box" style={{ width: 36, height: 36 }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="sidebar-brand-name">Vistara</span>
            <span className="sidebar-brand-badge">{role}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Workspace</div>

          {/* Security Guard Quick Screen */}
          {role === 'security' && (
            <Link
              to="/security"
              className={`nav-link ${location.pathname === '/security' ? 'active' : ''}`}
            >
              <ScanLine size={18} />
              <span>Gate Scanner &amp; Entry</span>
            </Link>
          )}

          {/* Receptionist Dashboard */}
          {role === 'receptionist' && (
            <Link
              to="/reception"
              className={`nav-link ${location.pathname === '/reception' ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Reception Desk</span>
            </Link>
          )}

          {/* Staff Dashboard */}
          {(role === 'staff' || role === 'host') && (
            <Link
              to="/staff"
              className={`nav-link ${location.pathname === '/staff' ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>My Visitors</span>
            </Link>
          )}

          {/* HR Dashboard */}
          {role === 'hr' && (
            <Link
              to="/hr"
              className={`nav-link ${location.pathname === '/hr' ? 'active' : ''}`}
            >
              <Briefcase size={18} />
              <span>HR &amp; Interviews</span>
            </Link>
          )}

          {/* Admin Dashboard */}
          {role === 'admin' && (
            <Link
              to="/admin"
              className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Admin Overview</span>
            </Link>
          )}

          <div className="nav-section-title">Quick Actions</div>

          {/* QR Camera for Security, Reception, Admin */}
          {(role === 'security' || role === 'receptionist' || role === 'admin') && (
            <Link
              to="/security"
              className={`nav-link ${location.pathname === '/security' && role !== 'security' ? 'active' : ''}`}
            >
              <QrCode size={18} />
              <span>Scan Visitor QR</span>
            </Link>
          )}

          {/* Overstay Alerts */}
          <Link
            to="/overstays"
            className={`nav-link ${location.pathname === '/overstays' ? 'active' : ''}`}
          >
            <Clock size={18} />
            <span>Overdue Alerts</span>
            {activeOverstaysCount > 0 && (
              <span className="nav-badge">{activeOverstaysCount}</span>
            )}
          </Link>

          {/* Self Service Portals */}
          <div className="nav-section-title">Visitor Portals</div>

          <Link to="/register-visit" target="_blank" className="nav-link">
            <FileText size={18} />
            <span>Visitor Self-Register ↗</span>
          </Link>

          <Link to="/status" target="_blank" className="nav-link">
            <QrCode size={18} />
            <span>Check Pass Status ↗</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="user-avatar">
              {user ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info-text">
              <div className="user-name-label">{user ? user.name : 'User'}</div>
              <div className="user-role-label">{user ? `${user.role} (${user.department})` : ''}</div>
            </div>
            <button
              className="icon-btn"
              onClick={handleLogout}
              title="Sign Out"
              style={{ width: 32, height: 32 }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- Main Content Workspace ---------------- */}
      <div className="app-main">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="navbar-title-group">
            <h1>{title || 'Vistara Workspace'}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <div className="navbar-actions">
            {activeOverstaysCount > 0 && (
              <Link
                to="/overstays"
                className="btn btn-danger"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <AlertTriangle size={15} />
                <span>{activeOverstaysCount} Overdue Visitor{activeOverstaysCount > 1 ? 's' : ''}</span>
              </Link>
            )}

            <button
              className="icon-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <Link to="/notifications" className="icon-btn" title="Alerts">
              <Bell size={18} />
              {unreadNotifications > 0 && <span className="notification-dot" />}
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body">{children}</main>
      </div>
    </div>
  );
}

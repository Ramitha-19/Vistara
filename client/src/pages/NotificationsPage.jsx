import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Layout from '../components/Layout';
import {
  Bell,
  Shield,
  CheckCircle2,
  Clock,
  User,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'notifications') {
        const data = await apiRequest('/system/notifications');
        setNotifications(data.notifications);
      } else if (activeTab === 'audit' && user?.role === 'admin') {
        const data = await apiRequest('/system/audit-logs');
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await apiRequest('/system/notifications/mark-read', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout
      title="Alerts &amp; Enterprise Audit Trail"
      subtitle="Operational Notifications &amp; Cryptographic Security Event Logs"
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={16} />
          <span>My Notifications ({notifications.length})</span>
        </button>

        {user?.role === 'admin' && (
          <button
            className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('audit')}
          >
            <Shield size={16} />
            <span>Admin Audit Trail</span>
          </button>
        )}
      </div>

      {activeTab === 'notifications' ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Operational Alerts</h3>
            <button className="btn btn-secondary" onClick={markAllRead} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Mark All as Read
            </button>
          </div>

          {notifications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid var(--border-light)',
                    backgroundColor: notif.isRead ? 'var(--bg-card)' : 'var(--primary-50)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: notif.type === 'overstay_alert' ? '#fee2e2' : 'var(--primary-100)',
                      color: notif.type === 'overstay_alert' ? '#dc2626' : 'var(--primary-600)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {notif.type === 'overstay_alert' ? <Clock size={16} /> : <CheckCircle2 size={16} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{notif.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{notif.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
              No notifications to display.
            </p>
          )}
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Security &amp; Audit Log History</h3>
            <button className="btn btn-secondary" onClick={loadData} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Refresh Logs
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action Event</th>
                  <th>Performed By</th>
                  <th>Role</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-Approved" style={{ fontFamily: 'monospace' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.performedBy ? log.performedBy.name : 'Public / System'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{log.userRole}</td>
                    <td style={{ fontSize: '0.85rem' }}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}

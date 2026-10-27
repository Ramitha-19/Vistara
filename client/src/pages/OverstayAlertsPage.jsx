import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Layout from '../components/Layout';
import {
  AlertTriangle,
  Clock,
  Settings,
  LogOut,
  Phone,
  Mail,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OverstayAlertsPage() {
  const { user } = useAuth();
  const [overstays, setOverstays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gracePeriod, setGracePeriod] = useState(15);
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    loadOverstayData();
    const interval = setInterval(loadOverstayData, 10000); // 10s auto refresh
    return () => clearInterval(interval);
  }, []);

  const loadOverstayData = async () => {
    try {
      const [overstayRes, configRes] = await Promise.all([
        apiRequest('/visits/overstays'),
        apiRequest('/users/config'),
      ]);
      setOverstays(overstayRes.overstays);
      if (configRes && configRes.config) {
        setGracePeriod(configRes.config.overstayGracePeriodMinutes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGracePeriod = async (e) => {
    e.preventDefault();
    setUpdatingConfig(true);
    try {
      await apiRequest('/users/config', {
        method: 'PUT',
        body: JSON.stringify({ overstayGracePeriodMinutes: Number(gracePeriod) }),
      });
      setFeedback('Grace period updated successfully! Recalculating active alerts.');
      loadOverstayData();
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setUpdatingConfig(false);
    }
  };

  const handleCheckoutOverdue = async (visitId) => {
    try {
      await apiRequest(`/visits/${visitId}/check-out`, { method: 'POST' });
      setFeedback('Overdue visitor checked out. Alert cleared.');
      loadOverstayData();
    } catch (err) {
      setFeedback(err.message);
    }
  };

  return (
    <Layout
      title="Intelligent Overstay Surveillance"
      subtitle="Automated Departure Rules, Grace Period Calibration &amp; Overdue Alerts"
    >
      {feedback && (
        <div className="alert-message alert-info" style={{ marginBottom: 20 }}>
          <span>{feedback}</span>
        </div>
      )}

      {/* Top Banner explaining rule */}
      <div
        className="card"
        style={{
          borderLeft: '4px solid #ef4444',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: '#fee2e2', padding: 12, borderRadius: 10, color: '#dc2626' }}>
            <ShieldAlert size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Active Overstay Rule</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Alert triggers when <em>Current Time &gt; Expected Departure + {gracePeriod} min Grace Period</em> while visitor is still Checked In.
            </p>
          </div>
        </div>

        {/* Admin Grace Period Setting */}
        {user && user.role === 'admin' && (
          <form onSubmit={handleUpdateGracePeriod} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Grace Period (Minutes):</label>
            <input
              type="number"
              min="0"
              max="120"
              className="form-input"
              style={{ width: 80, padding: '6px 10px' }}
              value={gracePeriod}
              onChange={(e) => setGracePeriod(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary" disabled={updatingConfig}>
              <Settings size={14} />
              <span>Save</span>
            </button>
          </form>
        )}
      </div>

      {/* Overstay Cards / Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#dc2626" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
              Active Overdue Visitors ({overstays.length})
            </h3>
          </div>
          <button className="btn btn-secondary" onClick={loadOverstayData} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Refresh
          </button>
        </div>

        {overstays.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Visitor</th>
                  <th>Organization</th>
                  <th>Host Employee</th>
                  <th>Scheduled Departure</th>
                  <th>Time Overdue</th>
                  <th style={{ textAlign: 'right' }}>Security Actions</th>
                </tr>
              </thead>
              <tbody>
                {overstays.map((visit) => (
                  <tr key={visit._id} style={{ backgroundColor: 'var(--status-overdue-bg)' }}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{visit.referenceNumber}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{visit.visitorName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{visit.visitorPhone}</div>
                    </td>
                    <td>{visit.organization}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{visit.host ? visit.host.name : 'Unassigned'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{visit.host?.department}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{visit.expectedDeparture}</td>
                    <td>
                      <span className="badge badge-Overdue">
                        +{visit.overdueMinutes} minutes overdue
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => handleCheckoutOverdue(visit._id)}
                      >
                        <LogOut size={13} />
                        <span>Force Check-Out</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Clock size={40} style={{ margin: '0 auto 10px', color: '#16a34a' }} />
            <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>Zero Overstay Violations</p>
            <p style={{ fontSize: '0.85rem' }}>All currently checked-in visitors are well within their approved schedules.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

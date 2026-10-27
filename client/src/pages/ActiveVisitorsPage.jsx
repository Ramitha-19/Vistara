import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Layout from '../components/Layout';
import {
  Users,
  Search,
  Filter,
  LogOut,
  Clock,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function ActiveVisitorsPage() {
  const { user } = useAuth();
  const [activeVisits, setActiveVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'overdue', 'normal'
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadActiveVisitors();
    const interval = setInterval(loadActiveVisitors, 15000); // 15s refresh for live overstay state
    return () => clearInterval(interval);
  }, []);

  const loadActiveVisitors = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/visits?status=CheckedIn');
      setActiveVisits(data.visits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutAction = async (visitId) => {
    try {
      setActionLoading(visitId);
      if (user?.role === 'security') {
        const res = await apiRequest(`/visits/${visitId}/check-out`, { method: 'POST' });
        setMsg(res.message);
      } else {
        const res = await apiRequest(`/visits/${visitId}/request-checkout`, { method: 'POST' });
        setMsg(res.message || 'Checkout request sent to Security. Please wait for approval.');
      }
      loadActiveVisitors();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = activeVisits.filter((v) => {
    const matchesSearch =
      v.visitorName.toLowerCase().includes(search.toLowerCase()) ||
      v.organization.toLowerCase().includes(search.toLowerCase()) ||
      v.referenceNumber.toLowerCase().includes(search.toLowerCase());

    if (filterType === 'overdue') return matchesSearch && v.isOverdue;
    if (filterType === 'normal') return matchesSearch && !v.isOverdue;
    return matchesSearch;
  });

  return (
    <Layout
      title="Active Facility Visitors"
      subtitle="Real-Time Building Occupancy &amp; Live Overstay Surveillance"
    >
      {msg && (
        <div className="alert-message alert-info" style={{ marginBottom: 16 }}>
          <span>{msg}</span>
        </div>
      )}

      {/* Control bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType('all')}
          >
            All Active ({activeVisits.length})
          </button>
          <button
            className={`btn ${filterType === 'overdue' ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setFilterType('overdue')}
          >
            Overdue ({activeVisits.filter((v) => v.isOverdue).length})
          </button>
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search active visitor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Visitor</th>
                <th>Organization</th>
                <th>Host</th>
                <th>Check-In Time</th>
                <th>Expected Exit</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((visit) => (
                  <tr key={visit._id} style={visit.isOverdue ? { backgroundColor: 'var(--status-overdue-bg)' } : {}}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{visit.referenceNumber}</td>
                    <td style={{ fontWeight: 600 }}>{visit.visitorName}</td>
                    <td>{visit.organization}</td>
                    <td>{visit.host ? visit.host.name : 'Unassigned'}</td>
                    <td>{new Date(visit.actualCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ fontWeight: 600, color: visit.isOverdue ? '#dc2626' : 'inherit' }}>
                      {visit.expectedDeparture}
                    </td>
                    <td>
                      {visit.isOverdue ? (
                        <span className="badge badge-Overdue">
                          ⚠️ Overdue +{visit.overdueMinutes}m
                        </span>
                      ) : (
                        <span className="badge badge-CheckedIn">In Premises</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                        {visit.checkoutRequest?.status === 'Pending' ? (
                          <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>
                            {user?.role === 'security' ? 'Approval Pending' : 'Awaiting Security...'}
                          </span>
                        ) : null}

                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.8rem',
                            color: user?.role === 'security' ? '#dc2626' : '#d97706',
                            borderColor: user?.role === 'security' ? '#fca5a5' : '#fcd34d',
                          }}
                          onClick={() => handleCheckoutAction(visit._id)}
                          disabled={actionLoading === visit._id || (user?.role !== 'security' && visit.checkoutRequest?.status === 'Pending')}
                        >
                          <LogOut size={13} />
                          <span>{user?.role === 'security' ? 'Direct Check-Out' : visit.checkoutRequest?.status === 'Pending' ? 'Pending' : 'Request Checkout'}</span>
                        </button>
                        <Link
                          to={`/status?ref=${visit.referenceNumber}`}
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '0.8rem' }}
                        >
                          <Eye size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                    No active visitors currently matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

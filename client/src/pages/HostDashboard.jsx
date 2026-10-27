import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  AlertCircle,
  Eye,
} from 'lucide-react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

export default function HostDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [myVisits, setMyVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModalVisit, setRejectModalVisit] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [feedback, setFeedback] = useState({ msg: '', isError: false });

  useEffect(() => {
    loadHostData();
  }, []);

  const loadHostData = async () => {
    try {
      setLoading(true);
      const [statsRes, visitsRes] = await Promise.all([
        apiRequest('/dashboard/stats'),
        apiRequest('/visits'),
      ]);
      setStats(statsRes.stats);
      setMyVisits(visitsRes.visits);
    } catch (err) {
      setFeedback({ msg: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (visitId) => {
    try {
      setActionLoading(visitId);
      await apiRequest(`/visits/${visitId}/approve`, { method: 'PUT' });
      setFeedback({ msg: 'Visit approved! Single-use QR pass is now active for visitor.', isError: false });
      loadHostData();
    } catch (err) {
      setFeedback({ msg: err.message, isError: true });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalVisit) return;
    try {
      setActionLoading(rejectModalVisit._id);
      await apiRequest(`/visits/${rejectModalVisit._id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason: rejectReason || 'Declined by host' }),
      });
      setFeedback({ msg: 'Visit request declined.', isError: false });
      setRejectModalVisit(null);
      setRejectReason('');
      loadHostData();
    } catch (err) {
      setFeedback({ msg: err.message, isError: true });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingVisits = myVisits.filter((v) => v.status === 'Pending');
  const activeVisits = myVisits.filter((v) => v.status === 'CheckedIn');

  return (
    <Layout
      title={`Host Workspace — Welcome, ${user ? user.name : 'Host'}`}
      subtitle="Manage your invited visitors, pending visit approvals, and meeting arrivals"
    >
      {feedback.msg && (
        <div className={`alert-message ${feedback.isError ? 'alert-error' : 'alert-info'}`}>
          <AlertCircle size={18} />
          <span>{feedback.msg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="spinner spinner-primary" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading host schedule &amp; visitor requests...</p>
        </div>
      ) : (
        <>
          {/* Host KPI Metrics */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div>
                <div className="kpi-title">Action Required</div>
                <div className="kpi-value" style={{ color: pendingVisits.length > 0 ? '#d97706' : 'inherit' }}>
                  {pendingVisits.length}
                </div>
                <div className="kpi-subtitle">Pending visitor requests</div>
              </div>
              <div className="kpi-icon-box kpi-icon-amber">
                <Clock size={22} />
              </div>
            </div>

            <div className="kpi-card">
              <div>
                <div className="kpi-title">Active In Office</div>
                <div className="kpi-value">{activeVisits.length}</div>
                <div className="kpi-subtitle">Currently checked-in with you</div>
              </div>
              <div className="kpi-icon-box kpi-icon-green">
                <Users size={22} />
              </div>
            </div>

            <div className="kpi-card">
              <div>
                <div className="kpi-title">Approved Upcoming</div>
                <div className="kpi-value">{stats ? stats.approvedUpcoming : 0}</div>
                <div className="kpi-subtitle">Expected arrivals</div>
              </div>
              <div className="kpi-icon-box kpi-icon-blue">
                <Calendar size={22} />
              </div>
            </div>
          </div>

          {/* Pending Approvals Table Section */}
          <div className="card" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Visitor Clearance Requests</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Approve to instantly generate cryptographic entry pass for visitor.</p>
              </div>
              <span className="badge badge-Pending">{pendingVisits.length} Pending</span>
            </div>

            {pendingVisits.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Visitor Name</th>
                      <th>Organization</th>
                      <th>Purpose</th>
                      <th>Scheduled Slot</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVisits.map((visit) => (
                      <tr key={visit._id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{visit.referenceNumber}</td>
                        <td style={{ fontWeight: 600 }}>{visit.visitorName}</td>
                        <td>{visit.organization}</td>
                        <td>{visit.purpose}</td>
                        <td>{visit.visitDate} ({visit.expectedArrival} - {visit.expectedDeparture})</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              className="btn btn-success"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => handleApprove(visit._id)}
                              disabled={actionLoading === visit._id}
                            >
                              <CheckCircle size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => setRejectModalVisit(visit)}
                              disabled={actionLoading === visit._id}
                            >
                              <XCircle size={14} />
                              <span>Decline</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                🎉 You have no pending visit requests waiting for approval.
              </div>
            )}
          </div>

          {/* My Full Visit History Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>My Scheduled &amp; Completed Visits</h3>
              <button className="btn btn-secondary" onClick={loadHostData} style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                Refresh
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Visitor</th>
                    <th>Organization</th>
                    <th>Date &amp; Schedule</th>
                    <th>Actual Check-In</th>
                    <th>Status</th>
                    <th>Pass</th>
                  </tr>
                </thead>
                <tbody>
                  {myVisits.map((visit) => (
                    <tr key={visit._id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{visit.referenceNumber}</td>
                      <td style={{ fontWeight: 600 }}>{visit.visitorName}</td>
                      <td>{visit.organization}</td>
                      <td>{visit.visitDate} ({visit.expectedArrival} - {visit.expectedDeparture})</td>
                      <td>
                        {visit.actualCheckInTime
                          ? new Date(visit.actualCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td>
                        <span className={`badge badge-${visit.status}`}>
                          {visit.isOverdue ? '⚠️ Overdue' : visit.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/status?ref=${visit.referenceNumber}`}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          title="View Visitor Pass"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rejection Modal */}
          {rejectModalVisit && (
            <div className="modal-overlay">
              <div className="modal-card">
                <div className="modal-header">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Decline Visit Request</h3>
                  <button
                    className="icon-btn"
                    onClick={() => setRejectModalVisit(null)}
                    style={{ width: 30, height: 30 }}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <p style={{ fontSize: '0.9rem', marginBottom: 14 }}>
                    Provide a reason for declining the visit request from <strong>{rejectModalVisit.visitorName}</strong> ({rejectModalVisit.organization}):
                  </p>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="e.g., Conflict with executive board meeting, please reschedule next week."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setRejectModalVisit(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={handleRejectConfirm}>
                    Confirm Decline
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  useEffect(() => {
    loadMyVisits();
  }, []);

  const loadMyVisits = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/visits');
      setVisits(res.visits || []);
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (visitId) => {
    setActionLoading(visitId);
    try {
      await apiRequest(`/visits/${visitId}/approve`, { method: 'PUT' });
      setFeedback({ text: 'Visitor request approved! Entry QR pass is now active.', type: 'success' });
      loadMyVisits();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (visitId) => {
    const reason = window.prompt('Please enter a brief reason for declining the visit:');
    if (reason === null) return;
    setActionLoading(visitId);
    try {
      await apiRequest(`/visits/${visitId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason: reason || 'Declined by host' }),
      });
      setFeedback({ text: 'Visit request declined.', type: 'info' });
      loadMyVisits();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestCheckout = async (visitId) => {
    setActionLoading(visitId);
    try {
      const res = await apiRequest(`/visits/${visitId}/request-checkout`, { method: 'POST' });
      setFeedback({ text: res.message || 'Checkout request sent to Security. Please wait for approval.', type: 'info' });
      loadMyVisits();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const pending = visits.filter((v) => v.status === 'Pending');
  const activeOrUpcoming = visits.filter((v) => v.status === 'Approved' || v.status === 'CheckedIn');

  return (
    <Layout
      title={`Staff Workspace — Hello, ${user ? user.name : 'Staff'}`}
      subtitle="View and approve visitors scheduled to meet with you"
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {feedback.text && (
          <div
            className={`alert-message ${feedback.type === 'error' ? 'alert-error' : 'alert-info'}`}
            style={{ marginBottom: 20 }}
          >
            <AlertCircle size={18} />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Essential Metrics */}
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <div className="kpi-card">
            <div>
              <div className="kpi-title">Awaiting Your Approval</div>
              <div className="kpi-value" style={{ color: pending.length > 0 ? '#d97706' : 'inherit' }}>
                {pending.length}
              </div>
              <div className="kpi-subtitle">Visitor requests pending</div>
            </div>
            <div className="kpi-icon-box kpi-icon-amber">
              <Clock size={22} />
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-title">In Office / Scheduled</div>
              <div className="kpi-value">{activeOrUpcoming.length}</div>
              <div className="kpi-subtitle">Approved visitors</div>
            </div>
            <div className="kpi-icon-box kpi-icon-green">
              <Users size={22} />
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        {pending.length > 0 && (
          <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid #f59e0b' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>
              Visitor Requests Requiring Your Approval
            </h3>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Visitor Name</th>
                    <th>Organization</th>
                    <th>Purpose</th>
                    <th>Scheduled Slot</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((v) => (
                    <tr key={v._id}>
                      <td style={{ fontWeight: 700 }}>{v.visitorName}</td>
                      <td>{v.organization}</td>
                      <td>{v.purpose}</td>
                      <td>{v.visitDate} ({v.expectedArrival} &ndash; {v.expectedDeparture})</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            className="btn btn-success"
                            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                            disabled={actionLoading === v._id}
                            onClick={() => handleApprove(v._id)}
                          >
                            <CheckCircle size={14} />
                            <span>Approve</span>
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.82rem', color: '#dc2626' }}
                            disabled={actionLoading === v._id}
                            onClick={() => handleReject(v._id)}
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
          </div>
        )}

        {/* Visitors Scheduled to Meet You */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Visitors Meeting You</h3>
            <button className="btn btn-secondary" onClick={loadMyVisits} style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
              Refresh
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Visitor Name</th>
                  <th>Organization</th>
                  <th>Purpose</th>
                  <th>Date &amp; Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visits.length > 0 ? (
                  visits.map((v) => (
                    <tr key={v._id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.referenceNumber}</td>
                      <td style={{ fontWeight: 700 }}>{v.visitorName}</td>
                      <td>{v.organization}</td>
                      <td>{v.purpose}</td>
                      <td>{v.visitDate} ({v.expectedArrival} &ndash; {v.expectedDeparture})</td>
                      <td>
                        <span className={`badge badge-${v.status}`}>
                          {v.isOverdue ? '⚠️ Overdue' : v.status === 'Approved' ? 'Expected' : v.status}
                        </span>
                        {v.checkoutRequest?.status === 'Pending' && (
                          <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 700, marginTop: 3 }}>
                            ⏳ Checkout Requested
                          </div>
                        )}
                        {v.checkoutRequest?.status === 'Rejected' && (
                          <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 600, marginTop: 3 }}>
                            ❌ Checkout Rejected
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          {v.status === 'CheckedIn' && (
                            <>
                              {v.checkoutRequest?.status === 'Pending' ? (
                                <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                                  Awaiting Security...
                                </span>
                              ) : (
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#d97706', borderColor: '#fcd34d' }}
                                  disabled={actionLoading === v._id}
                                  onClick={() => handleRequestCheckout(v._id)}
                                >
                                  Request Checkout
                                </button>
                              )}
                            </>
                          )}
                          <Link
                            to={`/status?ref=${v.referenceNumber}`}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      No visitor meetings scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

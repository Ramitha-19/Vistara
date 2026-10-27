import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import {
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HRDashboard() {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  useEffect(() => {
    loadHRVisits();
  }, []);

  const loadHRVisits = async () => {
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
      setFeedback({ text: 'Interview / HR visitor approved! QR pass issued.', type: 'success' });
      loadHRVisits();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (visitId) => {
    const reason = window.prompt('Reason for declining visit:');
    if (reason === null) return;
    setActionLoading(visitId);
    try {
      await apiRequest(`/visits/${visitId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason: reason || 'Declined by HR' }),
      });
      setFeedback({ text: 'Visit request declined.', type: 'info' });
      loadHRVisits();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = visits.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.visitorName.toLowerCase().includes(q) ||
      v.organization.toLowerCase().includes(q) ||
      v.purpose.toLowerCase().includes(q) ||
      v.referenceNumber.toLowerCase().includes(q)
    );
  });

  const candidatesCount = visits.filter(
    (v) =>
      v.purpose.toLowerCase().includes('interview') ||
      v.organization.toLowerCase().includes('candidate')
  ).length;

  const inBuildingCount = visits.filter((v) => v.status === 'CheckedIn').length;

  return (
    <Layout
      title="HR &amp; Recruitment Visitor Hub"
      subtitle="Candidate interviews, new joinee onboarding, and recruitment visits"
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

        {/* Essential HR Metrics */}
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <div className="kpi-card">
            <div>
              <div className="kpi-title">Candidate Interviews</div>
              <div className="kpi-value">{candidatesCount}</div>
              <div className="kpi-subtitle">Interview visits on record</div>
            </div>
            <div className="kpi-icon-box kpi-icon-blue">
              <Briefcase size={22} />
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-title">Currently in Facility</div>
              <div className="kpi-value">{inBuildingCount}</div>
              <div className="kpi-subtitle">Checked-in visitors</div>
            </div>
            <div className="kpi-icon-box kpi-icon-green">
              <Users size={22} />
            </div>
          </div>
        </div>

        {/* HR Visitors Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>HR &amp; Candidate Visits</h3>

            <div style={{ position: 'relative', width: 260 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 36, padding: '8px 12px 8px 36px' }}
                placeholder="Search candidate / visitor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Candidate / Visitor</th>
                  <th>Type / Org</th>
                  <th>Purpose</th>
                  <th>Scheduled Slot</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((v) => (
                    <tr key={v._id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.referenceNumber}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{v.visitorName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.visitorPhone}</div>
                      </td>
                      <td>{v.organization}</td>
                      <td style={{ fontWeight: 500 }}>{v.purpose}</td>
                      <td>{v.visitDate} ({v.expectedArrival} &ndash; {v.expectedDeparture})</td>
                      <td>
                        <span className={`badge badge-${v.status}`}>
                          {v.isOverdue ? '⚠️ Overdue' : v.status === 'Approved' ? 'Expected' : v.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {v.status === 'Pending' && (
                            <>
                              <button
                                className="btn btn-success"
                                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                disabled={actionLoading === v._id}
                                onClick={() => handleApprove(v._id)}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.78rem', color: '#dc2626' }}
                                disabled={actionLoading === v._id}
                                onClick={() => handleReject(v._id)}
                              >
                                Decline
                              </button>
                            </>
                          )}
                          <Link
                            to={`/status?ref=${v.referenceNumber}`}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          >
                            <Eye size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      No matching HR visitor records.
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

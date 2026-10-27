import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Briefcase,
  TrendingUp,
  Search,
  ChevronDown,
  UserCheck,
  CheckCircle,
  XCircle,
  FileText,
  Trash2,
  ShieldAlert,
  History,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import Layout from '../components/Layout';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Active & Expected Visitors State
  const [activeVisits, setActiveVisits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisitorId, setSelectedVisitorId] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState('');

  // 2. Admin-Only Visitor History State
  const [historyVisits, setHistoryVisits] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDate, setHistoryDate] = useState('');
  const [historySelectedId, setHistorySelectedId] = useState('');
  const [historySelectedVisitor, setHistorySelectedVisitor] = useState(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(false);
      const [statsRes, activeRes, historyRes] = await Promise.all([
        apiRequest('/dashboard/stats'),
        apiRequest('/visits?filter=activeRoster'),
        apiRequest('/visits/history'),
      ]);

      setStats(statsRes.stats);
      setActiveVisits(activeRes.visits || []);
      setHistoryVisits(historyRes.visits || []);

      // If active visitor is currently selected in dropdown, refresh their live details
      if (selectedVisitorId) {
        const found = (activeRes.visits || []).find((v) => v._id === selectedVisitorId);
        if (found) {
          setSelectedVisitor(found);
        }
      }

      // If history visitor is currently selected in dropdown, refresh their details
      if (historySelectedId) {
        const foundHist = (historyRes.visits || []).find((v) => v._id === historySelectedId);
        if (foundHist) {
          setHistorySelectedVisitor(foundHist);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load executive statistics.');
    }
  };

  // Handle Active Visitor dropdown selection
  const handleSelectVisitor = (e) => {
    const vId = e.target.value;
    setSelectedVisitorId(vId);
    if (!vId) {
      setSelectedVisitor(null);
      return;
    }
    const found = activeVisits.find((v) => v._id === vId);
    setSelectedVisitor(found || null);
  };

  // Handle History Visitor dropdown selection
  const handleSelectHistoryVisitor = (e) => {
    const vId = e.target.value;
    setHistorySelectedId(vId);
    if (!vId) {
      setHistorySelectedVisitor(null);
      return;
    }
    const found = historyVisits.find((v) => v._id === vId);
    setHistorySelectedVisitor(found || null);
  };

  // Filter active visitors table
  const filteredActiveVisits = activeVisits.filter((v) => {
    const q = searchTerm.toLowerCase();
    return (
      (v.referenceNumber && v.referenceNumber.toLowerCase().includes(q)) ||
      (v.visitorName && v.visitorName.toLowerCase().includes(q)) ||
      (v.organization && v.organization.toLowerCase().includes(q)) ||
      (v.host && v.host.name && v.host.name.toLowerCase().includes(q))
    );
  });

  // Filter history visitors table (search + date)
  const filteredHistoryVisits = historyVisits.filter((v) => {
    const q = historySearch.toLowerCase();
    const matchesSearch =
      !q ||
      (v.referenceNumber && v.referenceNumber.toLowerCase().includes(q)) ||
      (v.visitorName && v.visitorName.toLowerCase().includes(q)) ||
      (v.organization && v.organization.toLowerCase().includes(q)) ||
      (v.purpose && v.purpose.toLowerCase().includes(q)) ||
      (v.host?.name && v.host.name.toLowerCase().includes(q)) ||
      (v.checkedOutBy?.name && v.checkedOutBy.name.toLowerCase().includes(q));

    const matchesDate = !historyDate || v.visitDate === historyDate;
    return matchesSearch && matchesDate;
  });

  // End-of-Day Active List Cleanup trigger
  const handleTriggerEodCleanup = async () => {
    if (!window.confirm("Execute End-of-Day Active List Cleanup?\n\nThis safely archives completed 'CheckedOut' visitors from the active roster view while strictly preserving all records, pass IDs, and timestamps in MongoDB for historical audit reports.")) {
      return;
    }
    setCleanupLoading(true);
    setCleanupMessage('');
    try {
      const res = await apiRequest('/visits/trigger-eod-cleanup', { method: 'POST' });
      setCleanupMessage(`Cleanup complete: ${res.result.cleanedCount} completed visits archived from active roster. Full records preserved in MongoDB.`);
      loadDashboardData();
    } catch (err) {
      setCleanupMessage(`Cleanup error: ${err.message}`);
    } finally {
      setCleanupLoading(false);
    }
  };

  // Render Canonical Status Badge
  const renderStatusBadge = (visit) => {
    const st = visit.computedStatus || visit.status;
    let badgeClass = 'badge-Pending';
    let text = st;

    if (st === 'Expected') {
      badgeClass = 'badge-Approved';
      text = 'Expected';
    } else if (st === 'CheckedIn') {
      badgeClass = 'badge-CheckedIn';
      text = 'Checked In';
    } else if (st === 'Overdue') {
      badgeClass = 'badge-Overdue';
      text = `⚠️ Overdue (+${visit.overdueMinutes || 0}m)`;
    } else if (st === 'CheckoutRequested') {
      badgeClass = 'badge-Pending';
      text = '⏳ Checkout Requested';
    } else if (st === 'CheckedOut') {
      badgeClass = 'badge-CheckedOut';
      text = 'Checked Out';
    }

    return <span className={`badge ${badgeClass}`}>{text}</span>;
  };

  // Frontend Role Protection: Strictly Admin Only
  if (user && user.role !== 'admin') {
    return (
      <Layout title="Access Denied" subtitle="Administrator Clearance Required">
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <AlertTriangle size={48} color="#dc2626" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>403 - Forbidden</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Visitor History and Executive Administration is strictly reserved for users with the Administrator role.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Executive Command Center"
      subtitle="Corporate Visitor Volume, Overstay Surveillance & Live Visitor Management"
    >
      {error && <div className="alert-message alert-error">{error}</div>}

      {cleanupMessage && (
        <div className="alert-message alert-info" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={18} />
          <span>{cleanupMessage}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      {stats && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div>
              <div className="kpi-title">Today's Expected / Total</div>
              <div className="kpi-value">{stats.totalToday}</div>
              <div className="kpi-subtitle">Scheduled arrivals today</div>
            </div>
            <div className="kpi-icon-box kpi-icon-blue">
              <Calendar size={22} />
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-title">Currently Checked In</div>
              <div className="kpi-value">{stats.checkedInCount}</div>
              <div className="kpi-subtitle">Active inside facility</div>
            </div>
            <div className="kpi-icon-box kpi-icon-green">
              <Users size={22} />
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-title">Pending Approvals</div>
              <div className="kpi-value">{stats.pendingCount}</div>
              <div className="kpi-subtitle">Awaiting host clearance</div>
            </div>
            <div className="kpi-icon-box kpi-icon-amber">
              <Clock size={22} />
            </div>
          </div>

          <div className="kpi-card" style={stats.activeOverstays > 0 ? { borderColor: 'var(--status-overdue-border)' } : {}}>
            <div>
              <div className="kpi-title">Overstay Alerts</div>
              <div className="kpi-value" style={{ color: stats.activeOverstays > 0 ? '#dc2626' : 'inherit' }}>
                {stats.activeOverstays}
              </div>
              <div className="kpi-subtitle">Exceeded scheduled departure</div>
            </div>
            <div className="kpi-icon-box kpi-icon-red">
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>
      )}

      {/* ================= 1. VISITOR MANAGEMENT (ACTIVE ROSTER) ================= */}
      <div className="card" style={{ marginBottom: 28, borderTop: '4px solid var(--primary-600)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
              Visitor Management
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Real-time monitoring of all active and expected visitors with live status tracking.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', width: 240 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 36, padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
                placeholder="Search name or Pass ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* End of Day Active List Cleanup Button */}
            <button
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', color: '#475569' }}
              disabled={cleanupLoading}
              onClick={handleTriggerEodCleanup}
              title="Soft-archives completed checked-out visitors from active roster while preserving all MongoDB records"
            >
              <Trash2 size={15} />
              <span>{cleanupLoading ? 'Running...' : 'Run EOD Cleanup'}</span>
            </button>
          </div>
        </div>

        {/* Visitor Dropdown Selector & Details Card */}
        <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 10, padding: 20, marginBottom: 22 }}>
          <div className="form-group" style={{ marginBottom: selectedVisitor ? 18 : 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Select Registered Visitor by Name &amp; Pass ID:
            </label>
            <select
              className="form-select"
              value={selectedVisitorId}
              onChange={handleSelectVisitor}
              style={{ fontSize: '0.92rem', fontWeight: 500 }}
            >
              <option value="">-- Choose a visitor to view live details --</option>
              {activeVisits.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.visitorName} ({v.referenceNumber}) &bull; {v.computedStatus || v.status} &bull; Host: {v.host ? v.host.name : 'Staff'}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Visitor Info Card on the same page */}
          {selectedVisitor && (
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: 8,
                padding: '18px 20px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--border-light)', paddingBottom: 12 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Visitor Pass ID
                  </span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary-600)' }}>
                    {selectedVisitor.referenceNumber}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                    Current Live Status
                  </span>
                  {renderStatusBadge(selectedVisitor)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Full Name</span>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>{selectedVisitor.visitorName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedVisitor.organization}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Host Employee</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedVisitor.host ? selectedVisitor.host.name : 'Staff'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedVisitor.host?.department}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Visit Purpose</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedVisitor.purpose}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Check-In Time</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedVisitor.actualCheckInTime
                      ? new Date(selectedVisitor.actualCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Not Checked In'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Expected Checkout Time</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedVisitor.expectedDeparture}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Final Checkout Time</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedVisitor.actualCheckOutTime
                      ? new Date(selectedVisitor.actualCheckOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </div>
                </div>
              </div>

              {selectedVisitor.checkoutRequest?.status === 'Pending' && (
                <div style={{ marginTop: 14, padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: 6, color: '#1e40af', fontSize: '0.84rem', fontWeight: 600 }}>
                  ⏳ Checkout request was submitted by {selectedVisitor.checkoutRequest.requesterName || 'Host'} and is currently awaiting approval from Security gate officer.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Visitors Table */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Active &amp; Expected Visitors Roster ({filteredActiveVisits.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Shows Expected, CheckedIn, Overdue, and CheckoutRequested visits
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Visitor Pass ID</th>
                <th>Visitor Name</th>
                <th>Host Name</th>
                <th>Check-in Time</th>
                <th>Expected Checkout Time</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredActiveVisits.length > 0 ? (
                filteredActiveVisits.map((v) => (
                  <tr
                    key={v._id}
                    onClick={() => {
                      setSelectedVisitorId(v._id);
                      setSelectedVisitor(v);
                    }}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedVisitorId === v._id ? 'rgba(37, 99, 235, 0.08)' : 'inherit',
                    }}
                    title="Click row to view details above"
                  >
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.referenceNumber}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{v.visitorName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{v.organization}</div>
                    </td>
                    <td>{v.host ? v.host.name : 'Staff'}</td>
                    <td>
                      {v.actualCheckInTime
                        ? new Date(v.actualCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{v.expectedDeparture}</td>
                    <td>{renderStatusBadge(v)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    No active or expected visitors matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 2. ADMIN-ONLY VISITOR HISTORY SECTION ================= */}
      <div className="card" style={{ marginBottom: 28, borderTop: '4px solid #059669' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                Visitor History
              </h2>
              <span className="badge" style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 700, fontSize: '0.75rem' }}>
                Admin Only
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Permanent audit log of completed visits. Cleaned automatically from the active roster upon Security checkout and preserved in MongoDB.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* History Search Box */}
            <div style={{ position: 'relative', width: 230 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 36, padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
                placeholder="Search history by name, ID..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>

            {/* History Date Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="date"
                className="form-input"
                style={{ padding: '7px 10px', fontSize: '0.85rem', width: 145 }}
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                title="Filter by Visit Date"
              />
              {historyDate && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => setHistoryDate('')}
                  title="Clear Date Filter"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Completed Visitor Dropdown Selector & Details Card */}
        <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 10, padding: 20, marginBottom: 22 }}>
          <div className="form-group" style={{ marginBottom: historySelectedVisitor ? 18 : 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Select Completed Visitor from History:
            </label>
            <select
              className="form-select"
              value={historySelectedId}
              onChange={handleSelectHistoryVisitor}
              style={{ fontSize: '0.92rem', fontWeight: 500 }}
            >
              <option value="">-- Choose a completed visitor to view full historical details --</option>
              {filteredHistoryVisits.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.visitorName} ({v.referenceNumber}) &bull; Date: {v.visitDate} &bull; Out: {v.actualCheckOutTime ? new Date(v.actualCheckOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Done'} &bull; Host: {v.host ? v.host.name : 'Staff'}
                </option>
              ))}
            </select>
          </div>

          {/* Historical Visitor Full Details Card */}
          {historySelectedVisitor && (
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: 8,
                padding: '18px 20px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--border-light)', paddingBottom: 12 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Visitor Pass ID
                  </span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace', color: '#059669' }}>
                    {historySelectedVisitor.referenceNumber}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                    Final Status
                  </span>
                  <span className="badge badge-CheckedOut">Checked Out</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Visitor Full Name</span>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>{historySelectedVisitor.visitorName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{historySelectedVisitor.organization}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Host Name</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{historySelectedVisitor.host ? historySelectedVisitor.host.name : 'Staff'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{historySelectedVisitor.host?.department || 'Operations'}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Visit Purpose</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{historySelectedVisitor.purpose}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Visit Date</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{historySelectedVisitor.visitDate}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Check-In Time</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {historySelectedVisitor.actualCheckInTime
                      ? new Date(historySelectedVisitor.actualCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Check-Out Time</span>
                  <div style={{ fontWeight: 700, color: '#059669' }}>
                    {historySelectedVisitor.actualCheckOutTime
                      ? new Date(historySelectedVisitor.actualCheckOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Expected Checkout Time</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{historySelectedVisitor.expectedDeparture}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Checkout Security Staff</span>
                  <div style={{ fontWeight: 700, color: '#047857' }}>
                    {historySelectedVisitor.checkedOutBy?.name
                      ? `${historySelectedVisitor.checkedOutBy.name} (Security)`
                      : 'Security Gate Officer'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>ID Proof Verification</span>
                  <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                    {historySelectedVisitor.idProofType} ({historySelectedVisitor.idProofNumber || 'Verified'})
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Completed Visitor Records Table with All 10 Required Columns */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Completed Visitor Records ({filteredHistoryVisits.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Click any row to view complete visit details above
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Visitor Pass ID</th>
                <th>Visitor Full Name</th>
                <th>Host Name</th>
                <th>Visit Purpose</th>
                <th>Visit Date</th>
                <th>Check-in Time</th>
                <th>Check-out Time</th>
                <th>Expected Checkout Time</th>
                <th>Final Status</th>
                <th>Checkout Security Staff</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistoryVisits.length > 0 ? (
                filteredHistoryVisits.map((v) => (
                  <tr
                    key={v._id}
                    onClick={() => {
                      setHistorySelectedId(v._id);
                      setHistorySelectedVisitor(v);
                    }}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: historySelectedId === v._id ? 'rgba(5, 150, 105, 0.08)' : 'inherit',
                    }}
                    title="Click row to view full details above"
                  >
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>
                      {v.referenceNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{v.visitorName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{v.organization}</div>
                    </td>
                    <td>{v.host ? v.host.name : 'Staff'}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.purpose}>
                      {v.purpose}
                    </td>
                    <td>{v.visitDate}</td>
                    <td>
                      {v.actualCheckInTime
                        ? new Date(v.actualCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#059669' }}>
                      {v.actualCheckOutTime
                        ? new Date(v.actualCheckOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{v.expectedDeparture}</td>
                    <td>
                      <span className="badge badge-CheckedOut">Checked Out</span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#047857' }}>
                      {v.checkedOutBy?.name ? `${v.checkedOutBy.name} (Security)` : 'Security Officer'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                    No completed visitor records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 28 }}>
          {/* Visits by Organization */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Building2 size={18} color="var(--primary-600)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Top Visitor Organizations</h3>
            </div>
            {stats.orgBreakdown && stats.orgBreakdown.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.orgBreakdown.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{item._id || 'Independent'}</span>
                    <span className="badge badge-Approved">{item.count} Visits</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No organization data recorded yet.</p>
            )}
          </div>

          {/* Visits by Purpose */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Briefcase size={18} color="var(--primary-600)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Primary Visit Purposes</h3>
            </div>
            {stats.purposeBreakdown && stats.purposeBreakdown.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.purposeBreakdown.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{item._id}</span>
                    <span className="badge badge-CheckedIn">{item.count} Visits</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No purpose metrics available.</p>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

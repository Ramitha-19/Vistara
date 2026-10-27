import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Layout from '../components/Layout';
import {
  UserPlus,
  QrCode,
  Printer,
  CheckCircle2,
  Clock,
  Search,
  Users,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReceptionDashboard() {
  const [hosts, setHosts] = useState([]);
  const [todayVisits, setTodayVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newPass, setNewPass] = useState(null);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const currentH = String(now.getHours()).padStart(2, '0');
  const currentM = String(now.getMinutes()).padStart(2, '0');

  const [formData, setFormData] = useState({
    visitorName: '',
    visitorPhone: '',
    visitorEmail: '',
    organization: '',
    purpose: '',
    hostId: '',
    expectedDeparture: '18:00',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hostsRes, visitsRes] = await Promise.all([
        apiRequest('/users/hosts'),
        apiRequest(`/visits?date=${todayStr}`),
      ]);
      setHosts(hostsRes.hosts || []);
      setTodayVisits(visitsRes.visits || []);
      if (hostsRes.hosts && hostsRes.hosts.length > 0 && !formData.hostId) {
        setFormData((prev) => ({ ...prev, hostId: hostsRes.hosts[0]._id }));
      }
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        visitDate: todayStr,
        expectedArrival: `${currentH}:${currentM}`,
        isWalkin: true,
      };

      const res = await apiRequest('/visits/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Fetch generated QR pass details
      const statusRes = await apiRequest(`/visits/status/${res.visit.referenceNumber}`);
      setNewPass(statusRes.visit);
      setShowModal(false);

      // Reset form
      setFormData({
        visitorName: '',
        visitorPhone: '',
        visitorEmail: '',
        organization: '',
        purpose: '',
        hostId: hosts[0]?._id || '',
        expectedDeparture: '18:00',
      });

      setFeedback({
        text: `Visitor pass issued successfully for ${res.visit.visitorName}!`,
        type: 'success',
      });
      loadData();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    }
  };

  return (
    <Layout
      title="Receptionist Front Desk"
      subtitle="Register new visitors and issue instant entry passes"
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Alerts */}
        {feedback.text && (
          <div
            className={`alert-message ${feedback.type === 'success' ? 'alert-info' : 'alert-error'}`}
            style={{ marginBottom: 20 }}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Big Prominent Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Front Desk Visitor Desk
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Create entry passes and monitor today's scheduled arrivals.
            </p>
          </div>

          {/* LARGE REGISTER BUTTON */}
          <button
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: '1.05rem', fontWeight: 700, borderRadius: 10 }}
            onClick={() => setShowModal(true)}
          >
            <UserPlus size={20} />
            <span>REGISTER NEW VISITOR</span>
          </button>
        </div>

        {/* Issued Pass Pop-up Card */}
        {newPass && (
          <div
            className="card"
            style={{
              padding: 24,
              borderTop: '4px solid var(--primary-600)',
              boxShadow: 'var(--shadow-md)',
              marginBottom: 28,
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={24} color="#16a34a" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Visitor Pass Created</h3>
              </div>
              <button
                className="icon-btn"
                onClick={() => setNewPass(null)}
                style={{ width: 32, height: 32 }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              {newPass.qrCodeDataUrl && (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={newPass.qrCodeDataUrl}
                    alt="Visitor QR"
                    style={{ width: 170, height: 170, borderRadius: 8, border: '1px solid var(--border-light)' }}
                  />
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace', marginTop: 6 }}>
                    {newPass.referenceNumber}
                  </div>
                </div>
              )}

              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
                  {newPass.visitorName}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 12 }}>
                  {newPass.organization} &bull; Ph: {newPass.visitorPhone}
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Person to Meet</span>
                    <div style={{ fontWeight: 600 }}>{newPass.host?.name || 'Staff'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Expected Exit</span>
                    <div style={{ fontWeight: 600 }}>{newPass.expectedDeparture}</div>
                  </div>
                </div>

                <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => window.print()}
                    style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                  >
                    <Printer size={16} />
                    <span>Print Visitor Pass</span>
                  </button>
                  <Link
                    to={`/status?ref=${newPass.referenceNumber}`}
                    target="_blank"
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                  >
                    <Eye size={16} />
                    <span>Open Digital Pass</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Visitors Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Today's Visitors List ({todayVisits.length})</h3>
            <button className="btn btn-secondary" onClick={loadData} style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
              Refresh
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pass Ref</th>
                  <th>Visitor Name</th>
                  <th>Organization</th>
                  <th>Person to Meet</th>
                  <th>Time Slot</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Pass</th>
                </tr>
              </thead>
              <tbody>
                {todayVisits.length > 0 ? (
                  todayVisits.map((v) => (
                    <tr key={v._id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v.referenceNumber}</td>
                      <td style={{ fontWeight: 700 }}>{v.visitorName}</td>
                      <td>{v.organization}</td>
                      <td>{v.host ? v.host.name : 'Staff'}</td>
                      <td>{v.expectedArrival} - {v.expectedDeparture}</td>
                      <td>
                        <span className={`badge badge-${v.status}`}>
                          {v.isOverdue ? '⚠️ Overdue' : v.status === 'Approved' ? 'Expected' : v.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/status?ref=${v.referenceNumber}`}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      No visitors registered for today yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= Short & Clean Visitor Registration Modal ================= */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-card" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Register New Visitor</h3>
                <button className="icon-btn" onClick={() => setShowModal(false)} style={{ width: 30, height: 30 }}>
                  ×
                </button>
              </div>

              <form onSubmit={handleRegister}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Visitor Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Ananya Ramesh"
                      value={formData.visitorName}
                      onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input
                        type="tel"
                        className="form-input"
                        required
                        placeholder="e.g. +91 98411 98765"
                        value={formData.visitorPhone}
                        onChange={(e) => setFormData({ ...formData, visitorPhone: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Organization / Company *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="e.g. TCS Innovations"
                        value={formData.organization}
                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Person to Meet (Staff / Host) *</label>
                    <select
                      className="form-select"
                      required
                      value={formData.hostId}
                      onChange={(e) => setFormData({ ...formData, hostId: e.target.value })}
                    >
                      {hosts.map((h) => (
                        <option key={h._id} value={h._id}>
                          {h.name} — {h.department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Visit Purpose *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Technical Project Review, Interview, Vendor Meet"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expected Checkout Time *</label>
                    <input
                      type="time"
                      className="form-input"
                      required
                      value={formData.expectedDeparture}
                      onChange={(e) => setFormData({ ...formData, expectedDeparture: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', fontWeight: 700 }}>
                    Create Pass &amp; Generate QR
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import {
  ShieldCheck,
  Building,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function RegisterVisitPage() {
  const navigate = useNavigate();
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    visitorName: '',
    visitorEmail: '',
    visitorPhone: '',
    organization: '',
    purpose: '',
    hostId: '',
    visitDate: todayStr,
    expectedArrival: '10:00',
    expectedDeparture: '12:00',
    idProofType: 'Company ID',
    idProofNumber: '',
  });

  useEffect(() => {
    loadHosts();
  }, []);

  const loadHosts = async () => {
    try {
      const data = await apiRequest('/users/hosts');
      setHosts(data.hosts);
      if (data.hosts.length > 0) {
        setFormData((prev) => ({ ...prev, hostId: data.hosts[0]._id }));
      }
    } catch (err) {
      setErrorMsg('Failed to load employee directory.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.expectedDeparture <= formData.expectedArrival) {
      setErrorMsg('Expected departure time must be later than expected arrival time.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await apiRequest('/visits/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSuccessResult(res.visit);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2563eb, #1e3a8a)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Vistara Visitor Self-Registration
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Pre-register your upcoming workplace visit for host verification &amp; fast pass issuance.
          </p>
        </div>

        {successResult ? (
          <div className="card" style={{ textAlign: 'center', padding: 36, boxShadow: 'var(--shadow-md)' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>
              Visit Request Submitted!
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Your visit request has been logged and sent to your host for approval.
            </p>

            <div
              style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
                display: 'inline-block',
                width: '100%',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Your Reference Tracking Code
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary-600)' }}>
                {successResult.referenceNumber}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link
                to={`/status?ref=${successResult.referenceNumber}`}
                className="btn btn-primary"
              >
                <span>Track Status &amp; Access Pass</span>
                <ArrowRight size={16} />
              </Link>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSuccessResult(null);
                  setFormData({
                    ...formData,
                    visitorName: '',
                    visitorEmail: '',
                    visitorPhone: '',
                    organization: '',
                    purpose: '',
                  });
                }}
              >
                Register Another Visit
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
            {errorMsg && (
              <div className="alert-message alert-error" style={{ marginBottom: 20 }}>
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Alexander Wright"
                    value={formData.visitorName}
                    onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    required
                    placeholder="e.g. +1 (555) 019-3322"
                    value={formData.visitorPhone}
                    onChange={(e) => setFormData({ ...formData, visitorPhone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Work Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="alex@acme.com"
                    value={formData.visitorEmail}
                    onChange={(e) => setFormData({ ...formData, visitorEmail: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Organization / Company *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Acme Corp"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Employee Host *</label>
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
                <label className="form-label">Purpose of Visit *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Quarterly Strategic Vendor Review"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Visit Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={formData.visitDate}
                    onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Arrival *</label>
                  <input
                    type="time"
                    className="form-input"
                    required
                    value={formData.expectedArrival}
                    onChange={(e) => setFormData({ ...formData, expectedArrival: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Departure *</label>
                  <input
                    type="time"
                    className="form-input"
                    required
                    value={formData.expectedDeparture}
                    onChange={(e) => setFormData({ ...formData, expectedDeparture: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.98rem', marginTop: 10 }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <span>Submit Visit Request</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

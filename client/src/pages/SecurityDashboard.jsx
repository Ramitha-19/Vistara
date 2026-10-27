import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { apiRequest } from '../services/api';
import Layout from '../components/Layout';
import {
  QrCode,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  StopCircle,
  Search,
  Bell,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export default function SecurityDashboard() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [overdueAlerts, setOverdueAlerts] = useState([]);
  const [checkoutRequests, setCheckoutRequests] = useState([]);
  const [cameraError, setCameraError] = useState('');
  const [rejectingVisitId, setRejectingVisitId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const html5QrCodeRef = useRef(null);
  const autoCloseTimerRef = useRef(null);

  // Poll overdue alerts and pending checkout requests every 10 seconds
  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 10000);
    return () => {
      clearInterval(interval);
      stopCameraScanner();
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  const loadSecurityData = async () => {
    try {
      const [overdueRes, reqRes] = await Promise.all([
        apiRequest('/visits/overstays'),
        apiRequest('/visits/checkout-requests'),
      ]);
      if (overdueRes && overdueRes.overstays) {
        setOverdueAlerts(overdueRes.overstays);
      }
      if (reqRes && reqRes.requests) {
        setCheckoutRequests(reqRes.requests);
      }
    } catch (err) {
      console.warn('Security dashboard polling:', err.message);
    }
  };

  // Launch camera and start optical scanning
  const startCameraScanner = async () => {
    setCameraError('');
    setFeedback({ text: '', type: '' });
    setScanResult(null);
    setIsScanning(true);

    setTimeout(async () => {
      try {
        const qrScanner = new Html5Qrcode('security-qr-reader');
        html5QrCodeRef.current = qrScanner;

        const config = {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        };

        await qrScanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            lookupAndVerifyPass(decodedText);
            stopCameraScanner();
          },
          () => {}
        );
      } catch (err) {
        console.error('Camera initialization error:', err);
        setCameraError('Unable to open camera. Please allow camera permissions or enter the reference code below.');
        setIsScanning(false);
      }
    }, 250);
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error clearing camera:', err);
      }
    }
    setIsScanning(false);
  };

  // Verify pass via backend API
  const lookupAndVerifyPass = async (tokenOrRef) => {
    if (!tokenOrRef || !tokenOrRef.trim()) return;
    setLoading(true);
    setCameraError('');
    setFeedback({ text: '', type: '' });
    try {
      const data = await apiRequest('/visits/verify-scan', {
        method: 'POST',
        body: JSON.stringify({ tokenOrRef: tokenOrRef.trim() }),
      });
      setScanResult(data);
    } catch (err) {
      setFeedback({
        text: err.message || 'Invalid QR code. Please try again.',
        type: 'error',
      });
      setScanResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Check In action
  const handleCheckIn = async (visitId) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/visits/${visitId}/check-in`, { method: 'POST' });
      setFeedback({
        text: `SUCCESS: ${res.visit.visitorName} is now Checked In!`,
        type: 'success',
      });
      setScanResult(null);
      loadSecurityData();

      autoCloseTimerRef.current = setTimeout(() => {
        setFeedback({ text: '', type: '' });
      }, 4000);
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to check in.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Security Direct Check-Out action (QR or Button)
  const handleDirectCheckOut = async (visitId) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/visits/${visitId}/check-out`, { method: 'POST' });
      setFeedback({
        text: `SUCCESS: ${res.visit.visitorName} has officially Checked Out!`,
        type: 'success',
      });
      setScanResult(null);
      loadSecurityData();

      autoCloseTimerRef.current = setTimeout(() => {
        setFeedback({ text: '', type: '' });
      }, 4000);
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to check out.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Security Approves Checkout Request
  const handleApproveCheckoutRequest = async (visitId) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/visits/${visitId}/approve-checkout`, { method: 'POST' });
      setFeedback({
        text: `CHECKOUT APPROVED: ${res.visit.visitorName} is Checked Out and pass is revoked!`,
        type: 'success',
      });
      loadSecurityData();

      autoCloseTimerRef.current = setTimeout(() => {
        setFeedback({ text: '', type: '' });
      }, 4000);
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to approve checkout.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Security Rejects Checkout Request
  const handleRejectCheckoutRequest = async (visitId) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/visits/${visitId}/reject-checkout`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectionReason || 'Declined by Security officer' }),
      });
      setFeedback({
        text: `Checkout request rejected. Visitor ${res.visit.visitorName} remains Checked In.`,
        type: 'info',
      });
      setRejectingVisitId(null);
      setRejectionReason('');
      loadSecurityData();

      autoCloseTimerRef.current = setTimeout(() => {
        setFeedback({ text: '', type: '' });
      }, 4000);
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to reject checkout.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title="Security Gate Entry & Exit Control"
      subtitle="Exclusive security authority for QR verification, check-in, and final checkout approvals"
    >
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        {/* ================= 1. Pending Checkout Approvals (Highest Priority Feature) ================= */}
        {checkoutRequests.length > 0 && (
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '2px solid #3b82f6',
              borderRadius: 14,
              padding: '20px 24px',
              marginBottom: 24,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={28} color="#2563eb" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>
                  PENDING CHECKOUT APPROVALS ({checkoutRequests.length})
                </h3>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  padding: '4px 12px',
                  borderRadius: 999,
                }}
              >
                Security Authorization Required
              </span>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#3b82f6', marginBottom: 16 }}>
              The following visitors or their hosts have requested checkout clearance. Security has final authority to approve or reject.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {checkoutRequests.map((req) => (
                <div
                  key={req._id}
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '18px 20px',
                    borderRadius: 10,
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
                        {req.visitorName}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#475569', marginTop: 2 }}>
                        {req.organization} &bull; Ref: <strong style={{ fontFamily: 'monospace' }}>{req.referenceNumber}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-CheckedIn" style={{ fontSize: '0.85rem' }}>
                        Checked In
                      </span>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                        Requested at: {req.checkoutRequest?.requestedAt ? new Date(req.checkoutRequest.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#334155', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Host Employee:</span>{' '}
                      <strong>{req.host ? req.host.name : 'Staff'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Requested By:</span>{' '}
                      <strong>{req.checkoutRequest?.requesterName || 'Host / Visitor'}</strong>
                    </div>
                  </div>

                  {/* LARGE APPROVE CHECKOUT & REJECT BUTTONS */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        padding: '14px 20px',
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        backgroundColor: '#16a34a',
                        borderColor: '#16a34a',
                        borderRadius: 10,
                      }}
                      disabled={loading}
                      onClick={() => handleApproveCheckoutRequest(req._id)}
                    >
                      <LogOut size={20} />
                      <span>APPROVE CHECKOUT</span>
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{
                        padding: '14px 24px',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#dc2626',
                        borderColor: '#fca5a5',
                        borderRadius: 10,
                      }}
                      disabled={loading}
                      onClick={() => setRejectingVisitId(req._id)}
                    >
                      <XCircle size={20} />
                      <span>REJECT</span>
                    </button>
                  </div>

                  {/* Rejection reason inline form */}
                  {rejectingVisitId === req._id && (
                    <div style={{ backgroundColor: '#fef2f2', padding: 14, borderRadius: 8, marginTop: 8 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#991b1b', display: 'block', marginBottom: 6 }}>
                        Reason for declining checkout request:
                      </label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Visitor badge not returned, visitor still in meeting..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                        />
                        <button
                          className="btn btn-danger"
                          style={{ whiteSpace: 'nowrap', fontWeight: 700 }}
                          onClick={() => handleRejectCheckoutRequest(req._id)}
                        >
                          Confirm Rejection
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setRejectingVisitId(null);
                            setRejectionReason('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 2. Overdue Visitors Notification Area ================= */}
        {overdueAlerts.length > 0 && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '2px solid #ef4444',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <AlertTriangle size={24} color="#dc2626" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#991b1b' }}>
                OVERDUE VISITOR ALERT ({overdueAlerts.length})
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {overdueAlerts.map((v) => (
                <div
                  key={v._id}
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #fecaca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.02rem', fontWeight: 700, color: '#111827' }}>
                      {v.visitorName} ({v.organization})
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      Host: <strong>{v.host ? v.host.name : 'Staff'}</strong> &bull; Expected exit was at{' '}
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>{v.expectedDeparture}</span> (+{v.overdueMinutes} mins overdue)
                    </div>
                  </div>

                  <button
                    className="btn btn-danger"
                    style={{ padding: '8px 16px', fontWeight: 600, fontSize: '0.88rem' }}
                    onClick={() => handleDirectCheckOut(v._id)}
                  >
                    <LogOut size={16} />
                    <span>Security Check Out</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 3. Confirmation Feedback Message ================= */}
        {feedback.text && (
          <div
            style={{
              padding: '18px 22px',
              borderRadius: 12,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              backgroundColor: feedback.type === 'success' ? '#dcfce7' : feedback.type === 'info' ? '#eff6ff' : '#fee2e2',
              color: feedback.type === 'success' ? '#14532d' : feedback.type === 'info' ? '#1e40af' : '#991b1b',
              border: `2px solid ${feedback.type === 'success' ? '#22c55e' : feedback.type === 'info' ? '#3b82f6' : '#ef4444'}`,
            }}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={30} /> : <XCircle size={30} />}
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{feedback.text}</div>
          </div>
        )}

        {/* ================= 4. Primary Security Action Card ================= */}
        <div className="card" style={{ padding: 32, textAlign: 'center', boxShadow: 'var(--shadow-md)', marginBottom: 24 }}>
          {!isScanning && !scanResult && (
            <div>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Hold the visitor's printed or phone QR pass in front of the camera for optical verification.
              </p>

              {/* HUGE SCAN VISITOR QR BUTTON */}
              <button
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '22px 24px',
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  borderRadius: 14,
                  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                }}
                onClick={startCameraScanner}
              >
                <QrCode size={36} />
                <span>SCAN VISITOR QR</span>
              </button>

              {/* Fallback Manual Reference Search */}
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Or enter visitor reference code manually:
                </span>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    lookupAndVerifyPass(manualCode);
                  }}
                  style={{ display: 'flex', gap: 10, marginTop: 10, maxWidth: 440, margin: '12px auto 0' }}
                >
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. VST-20261013-ANAN"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                  />
                  <button type="submit" className="btn btn-secondary" style={{ padding: '0 20px', fontWeight: 600 }}>
                    <Search size={16} />
                    <span>Check</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Camera Viewport */}
          {isScanning && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-700)' }}>
                  Camera Active
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  Show the visitor QR code to the camera. It scans automatically.
                </p>
              </div>

              <div
                style={{
                  maxWidth: 420,
                  margin: '0 auto',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '3px solid var(--primary-600)',
                  backgroundColor: '#000000',
                }}
              >
                <div id="security-qr-reader" style={{ width: '100%' }} />
              </div>

              <button
                className="btn btn-secondary"
                style={{ marginTop: 20, padding: '12px 24px', fontWeight: 600 }}
                onClick={stopCameraScanner}
              >
                <StopCircle size={18} />
                <span>Cancel Camera</span>
              </button>
            </div>
          )}

          {cameraError && (
            <div className="alert-message alert-error" style={{ marginTop: 20 }}>
              <AlertTriangle size={20} />
              <span>{cameraError}</span>
            </div>
          )}

          {/* ================= 5. Scanned Visitor Details & One Obvious Action ================= */}
          {scanResult && scanResult.visit && (
            <div style={{ textAlign: 'left', marginTop: 10 }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-main)',
                  padding: 24,
                  borderRadius: 12,
                  border: '1px solid var(--border-light)',
                  marginBottom: 24,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Visitor Name
                    </span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {scanResult.visit.visitorName}
                    </div>
                  </div>

                  <span
                    className={`badge badge-${scanResult.visit.status}`}
                    style={{ fontSize: '1rem', padding: '8px 16px' }}
                  >
                    {scanResult.visit.isOverdue
                      ? '⚠️ Overdue'
                      : scanResult.visit.status === 'Approved'
                      ? 'Expected'
                      : scanResult.visit.status === 'CheckedIn'
                      ? 'Checked In'
                      : scanResult.visit.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.95rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Organization</span>
                    <div style={{ fontWeight: 600 }}>{scanResult.visit.organization}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Person to Meet (Host)</span>
                    <div style={{ fontWeight: 600 }}>{scanResult.visit.host?.name || 'Staff'}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Purpose</span>
                    <div style={{ fontWeight: 600 }}>{scanResult.visit.purpose}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scheduled Time</span>
                    <div style={{ fontWeight: 600 }}>
                      {scanResult.visit.expectedArrival} &ndash; {scanResult.visit.expectedDeparture}
                    </div>
                  </div>
                </div>

                {scanResult.visit.checkoutRequest?.status === 'Pending' && (
                  <div style={{ marginTop: 16, padding: '10px 14px', backgroundColor: '#dbeafe', borderRadius: 8, color: '#1e40af', fontSize: '0.88rem', fontWeight: 600 }}>
                    ℹ️ Visitor or Host requested checkout clearance. Security authority ready to execute.
                  </div>
                )}
              </div>

              {/* SINGLE OBVIOUS ACTION BUTTON */}
              {scanResult.visit.status === 'Approved' && (
                <button
                  className="btn btn-success"
                  style={{
                    width: '100%',
                    padding: '20px',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                  disabled={loading}
                  onClick={() => handleCheckIn(scanResult.visit._id)}
                >
                  <LogIn size={30} />
                  <span>{loading ? 'Processing...' : 'CHECK IN VISITOR'}</span>
                </button>
              )}

              {scanResult.visit.status === 'CheckedIn' && (
                <button
                  className="btn btn-danger"
                  style={{
                    width: '100%',
                    padding: '20px',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                  disabled={loading}
                  onClick={() => handleDirectCheckOut(scanResult.visit._id)}
                >
                  <LogOut size={30} />
                  <span>{loading ? 'Processing...' : 'CHECK OUT VISITOR'}</span>
                </button>
              )}

              {scanResult.visit.status === 'CheckedOut' && (
                <div
                  style={{
                    padding: 20,
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: '1.15rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  Visit completed. This pass has already been checked out.
                </div>
              )}

              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: 14, padding: '12px', fontWeight: 600 }}
                onClick={() => setScanResult(null)}
              >
                Back to Scan Screen
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

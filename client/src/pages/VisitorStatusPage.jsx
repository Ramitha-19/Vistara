import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import {
  ShieldCheck,
  QrCode,
  Search,
  Calendar,
  Clock,
  User,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Printer,
} from 'lucide-react';

export default function VisitorStatusPage() {
  const [searchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [refInput, setRefInput] = useState(initialRef);
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialRef) {
      lookupVisit(initialRef);
    }
  }, [initialRef]);

  const lookupVisit = async (refCode) => {
    if (!refCode) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiRequest(`/visits/status/${refCode.trim()}`);
      setVisit(data.visit);
    } catch (err) {
      setErrorMsg(err.message || 'No visit found with the specified reference number.');
      setVisit(null);
    } finally {
      setLoading(false);
    }
  };

  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });
  const [requestLoading, setRequestLoading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleRequestCheckout = async () => {
    if (!visit) return;
    setRequestLoading(true);
    setFeedbackMsg({ text: '', type: '' });
    try {
      const res = await apiRequest(`/visits/${visit._id}/request-checkout-public`, {
        method: 'POST',
        body: JSON.stringify({ requesterName: visit.visitorName }),
      });
      setFeedbackMsg({ text: 'Checkout request sent to Security. Please wait for approval.', type: 'info' });
      lookupVisit(visit.referenceNumber);
    } catch (err) {
      setFeedbackMsg({ text: err.message || 'Failed to request checkout.', type: 'error' });
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2563eb, #1e3a8a)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Vistara Visitor Pass &amp; Status
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter your visit reference to retrieve real-time clearance status and digital QR pass.
          </p>
        </div>

        {/* Reference Lookup Form */}
        <div className="card" style={{ marginBottom: 24 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookupVisit(refInput);
            }}
            style={{ display: 'flex', gap: 10 }}
          >
            <input
              type="text"
              className="form-input"
              placeholder="e.g. VST-20261013-APP2"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !refInput.trim()}>
              <Search size={16} />
              <span>Lookup</span>
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="alert-message alert-error" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner spinner-primary" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)' }}>Retrieving pass credentials from database...</p>
          </div>
        )}

        {/* Pass Card Display */}
        {visit && !loading && (
          <div className="card" style={{ boxShadow: 'var(--shadow-md)', borderTop: '4px solid var(--primary-600)' }}>
            {/* Header / Reference */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Reference Number
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-main)' }}>
                  {visit.referenceNumber}
                </div>
              </div>
              <span className={`badge badge-${visit.status}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                {visit.status}
              </span>
            </div>

            {/* QR Pass Section (If Approved) */}
            {visit.status === 'Approved' || visit.status === 'CheckedIn' ? (
              <div style={{ textAlign: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-light)', marginBottom: 20 }}>
                {visit.qrCodeDataUrl ? (
                  <div>
                    <img
                      src={visit.qrCodeDataUrl}
                      alt="Encrypted Entry QR Pass"
                      style={{
                        width: 200,
                        height: 200,
                        borderRadius: 12,
                        padding: 8,
                        background: '#ffffff',
                        border: '1px solid var(--border-light)',
                        boxShadow: 'var(--shadow-sm)',
                        margin: '0 auto 12px',
                        display: 'block',
                      }}
                    />
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Present this pass at security gate or reception for optical scanning.
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: 20, background: 'var(--bg-main)', borderRadius: 8 }}>
                    <p style={{ color: 'var(--text-muted)' }}>QR pass is currently revoked or expired.</p>
                  </div>
                )}

                {/* CheckedIn Status: Request Checkout Button or Pending Indicator */}
                {visit.status === 'CheckedIn' && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed var(--border-light)' }}>
                    {feedbackMsg.text && (
                      <div
                        className={`alert-message ${feedbackMsg.type === 'error' ? 'alert-error' : 'alert-info'}`}
                        style={{ marginBottom: 12, textAlign: 'left' }}
                      >
                        <AlertCircle size={18} />
                        <span>{feedbackMsg.text}</span>
                      </div>
                    )}

                    {visit.checkoutRequest?.status === 'Pending' ? (
                      <div
                        style={{
                          backgroundColor: '#eff6ff',
                          border: '1.5px solid #93c5fd',
                          borderRadius: 10,
                          padding: '14px 18px',
                          color: '#1e40af',
                          fontWeight: 600,
                          fontSize: '0.92rem',
                        }}
                      >
                        ⏳ Checkout request sent to Security. Please wait for approval.
                      </div>
                    ) : visit.checkoutRequest?.status === 'Rejected' ? (
                      <div>
                        <div
                          style={{
                            backgroundColor: '#fef2f2',
                            border: '1.5px solid #fca5a5',
                            borderRadius: 10,
                            padding: '12px 16px',
                            color: '#991b1b',
                            fontSize: '0.88rem',
                            marginBottom: 10,
                          }}
                        >
                          Checkout request declined: {visit.checkoutRequest?.rejectionReason || 'Security officer declined'}.
                        </div>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700, color: '#d97706', borderColor: '#fcd34d' }}
                          disabled={requestLoading}
                          onClick={handleRequestCheckout}
                        >
                          {requestLoading ? 'Sending...' : 'Request Checkout Again'}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{
                          width: '100%',
                          maxWidth: 320,
                          padding: '12px 24px',
                          fontSize: '1rem',
                          fontWeight: 700,
                          backgroundColor: '#2563eb',
                        }}
                        disabled={requestLoading}
                        onClick={handleRequestCheckout}
                      >
                        {requestLoading ? 'Sending Request...' : 'Request Checkout'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : visit.status === 'Pending' ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--status-pending-bg)', borderRadius: 8, marginBottom: 20 }}>
                <Clock size={36} color="var(--status-pending-text)" style={{ margin: '0 auto 8px' }} />
                <h4 style={{ color: 'var(--status-pending-text)', fontWeight: 700, marginBottom: 4 }}>
                  Awaiting Host Approval
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--status-pending-text)' }}>
                  Your host ({visit.host?.name}) has received the visit request. Once approved, your encrypted QR pass will appear here automatically.
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--status-rejected-bg)', borderRadius: 8, marginBottom: 20 }}>
                <XCircle size={36} color="var(--status-rejected-text)" style={{ margin: '0 auto 8px' }} />
                <h4 style={{ color: 'var(--status-rejected-text)', fontWeight: 700, marginBottom: 4 }}>
                  Visit Request Declined
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--status-rejected-text)' }}>
                  Reason: {visit.rejectionReason || 'No specific explanation provided.'}
                </p>
              </div>
            )}

            {/* Visitor & Host Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, fontSize: '0.88rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Visitor</span>
                <div style={{ fontWeight: 600 }}>{visit.visitorName}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{visit.organization}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{visit.visitorPhone}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Host Employee</span>
                <div style={{ fontWeight: 600 }}>{visit.host?.name || 'Unassigned'}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{visit.host?.department}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{visit.host?.email}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date &amp; Scheduled Slot</span>
                <div style={{ fontWeight: 600 }}>{visit.visitDate}</div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {visit.expectedArrival} &ndash; {visit.expectedDeparture}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Purpose</span>
                <div style={{ fontWeight: 600 }}>{visit.purpose}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
              <Link to="/register-visit" style={{ fontSize: '0.85rem', color: 'var(--primary-600)', fontWeight: 500 }}>
                &larr; Submit Another Request
              </Link>
              <button className="btn btn-secondary" onClick={handlePrint} style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                <Printer size={15} />
                <span>Print Pass</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

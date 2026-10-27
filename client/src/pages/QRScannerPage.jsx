import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { apiRequest } from '../services/api';
import Layout from '../components/Layout';
import {
  Camera,
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LogIn,
  LogOut,
  Search,
  StopCircle,
} from 'lucide-react';

export default function QRScannerPage() {
  const [scannerActive, setScannerActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setErrorMsg('');
    setScanResult(null);
    try {
      setScannerActive(true);
      // Wait for DOM element #qr-reader to be mounted
      setTimeout(async () => {
        try {
          const qrCodeScanner = new Html5Qrcode('qr-reader');
          html5QrCodeRef.current = qrCodeScanner;

          const config = { fps: 10, qrbox: { width: 250, height: 250 } };

          await qrCodeScanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              // On Successful Scan
              console.log('Decoded QR Text:', decodedText);
              handleVerify(decodedText);
              stopScanner();
            },
            (errorMessage) => {
              // Frame scan error - normal while searching
            }
          );
        } catch (err) {
          console.error('Camera startup error:', err);
          setErrorMsg('Camera access denied or no video input device detected. You can use manual Reference lookup below.');
          setScannerActive(false);
        }
      }, 300);
    } catch (err) {
      setErrorMsg('Failed to initialize camera scanner.');
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setScannerActive(false);
  };

  const handleVerify = async (tokenOrRef) => {
    if (!tokenOrRef) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiRequest('/visits/verify-scan', {
        method: 'POST',
        body: JSON.stringify({ tokenOrRef }),
      });
      setScanResult(data);
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed. Pass token is invalid or expired.');
      setScanResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePerformCheckIn = async (visitId) => {
    setActionLoading(true);
    try {
      const res = await apiRequest(`/visits/${visitId}/check-in`, { method: 'POST' });
      setScanResult((prev) => ({
        ...prev,
        verificationStatus: 'Already Checked In',
        canCheckIn: false,
        canCheckOut: true,
        message: res.message,
        visit: res.visit,
      }));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePerformCheckOut = async (visitId) => {
    setActionLoading(true);
    try {
      const res = await apiRequest(`/visits/${visitId}/check-out`, { method: 'POST' });
      setScanResult((prev) => ({
        ...prev,
        verificationStatus: 'Already Checked Out',
        canCheckIn: false,
        canCheckOut: false,
        message: res.message,
        visit: res.visit,
      }));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout
      title="QR Pass Verification Scanner"
      subtitle="Live Hardware Camera Scanner & Cryptographic Pass Validator"
    >
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        {errorMsg && (
          <div className="alert-message alert-error" style={{ marginBottom: 20 }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Optical Camera Scanner</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Point laptop webcam or USB scanner at visitor's digital QR pass.
              </p>
            </div>

            {scannerActive ? (
              <button className="btn btn-danger" onClick={stopScanner}>
                <StopCircle size={16} />
                <span>Stop Camera</span>
              </button>
            ) : (
              <button className="btn btn-primary" onClick={startScanner}>
                <Camera size={16} />
                <span>Start Camera Scanner</span>
              </button>
            )}
          </div>

          {/* Scanner Viewport */}
          <div
            style={{
              minHeight: 280,
              backgroundColor: 'rgba(0,0,0,0.03)',
              borderRadius: 8,
              border: '2px dashed var(--border-light)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {scannerActive ? (
              <div id="qr-reader" style={{ width: '100%', maxWidth: 450 }} />
            ) : (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                <ScanLine size={48} style={{ margin: '0 auto 12px', strokeWidth: 1.5, color: 'var(--primary-600)' }} />
                <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>Camera scanner is currently standby.</p>
                <p style={{ fontSize: '0.8rem' }}>Click "Start Camera Scanner" to request camera permission.</p>
              </div>
            )}
          </div>

          {/* Fallback Manual Code Lookup */}
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border-light)' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(manualCode);
              }}
              style={{ display: 'flex', gap: 12 }}
            >
              <input
                type="text"
                className="form-input"
                placeholder="Enter Reference Number (e.g. VST-20261013-APP2) or token..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary" disabled={loading || !manualCode.trim()}>
                <Search size={16} />
                <span>Verify Pass</span>
              </button>
            </form>
          </div>
        </div>

        {/* Verification Result Card */}
        {scanResult && (
          <div
            className="card"
            style={{
              borderColor:
                scanResult.verificationStatus === 'Valid'
                  ? 'var(--primary-600)'
                  : scanResult.verificationStatus === 'Already Checked In'
                  ? '#16a34a'
                  : '#dc2626',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {scanResult.success ? (
                <CheckCircle2 size={24} color="#16a34a" />
              ) : (
                <XCircle size={24} color="#dc2626" />
              )}
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  Verification Status: {scanResult.verificationStatus}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{scanResult.message}</p>
              </div>
            </div>

            {scanResult.visit && (
              <div style={{ background: 'var(--bg-main)', padding: 18, borderRadius: 8, marginBottom: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Visitor</span>
                    <div style={{ fontWeight: 600 }}>{scanResult.visit.visitorName}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{scanResult.visit.organization}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Host Employee</span>
                    <div style={{ fontWeight: 600 }}>{scanResult.visit.host?.name || 'Unassigned'}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{scanResult.visit.host?.department}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reference #</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{scanResult.visit.referenceNumber}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Slot</span>
                    <div style={{ fontWeight: 600 }}>
                      {scanResult.visit.visitDate} ({scanResult.visit.expectedArrival} - {scanResult.visit.expectedDeparture})
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons based on Scan State */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              {scanResult.canCheckIn && (
                <button
                  className="btn btn-primary"
                  onClick={() => handlePerformCheckIn(scanResult.visit._id)}
                  disabled={actionLoading}
                >
                  <LogIn size={16} />
                  <span>Execute Check-In</span>
                </button>
              )}

              {scanResult.canCheckOut && (
                <button
                  className="btn btn-danger"
                  onClick={() => handlePerformCheckOut(scanResult.visit._id)}
                  disabled={actionLoading}
                >
                  <LogOut size={16} />
                  <span>Execute Check-Out</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

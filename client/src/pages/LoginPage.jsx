import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  QrCode,
  Clock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import '../styles/login.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const { login, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your work email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const response = await login(email, password);
      const role = response.user.role;
      // Role-based routing redirection
      if (role === 'security') navigate('/security');
      else if (role === 'receptionist') navigate('/reception');
      else if (role === 'staff' || role === 'host') navigate('/staff');
      else if (role === 'hr') navigate('/hr');
      else if (role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, roleLabel) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMsg('');
    setInfoMsg(`Filled ${roleLabel} account.`);
  };

  return (
    <div className="login-page">
      {/* ---------------- Left Section: Clean Enterprise Branding ---------------- */}
      <section className="login-left">
        <div className="login-brand-header">
          <div className="brand-icon-box">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="brand-name">Vistara</div>
            <div className="brand-subtitle">Enterprise Visitor Management</div>
          </div>
        </div>

        <div className="login-left-content">
          <h1 className="login-headline">
            Secure Every Entry.<br />Simplify Every Visit.
          </h1>
          <p className="login-description">
            A fast, user-friendly visitor clearance system. Instant QR pass verification at security gates, host approvals, and automated overstay surveillance.
          </p>

          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <QrCode size={18} />
              </div>
              <div>
                <div className="feature-title">One-Tap QR Scanning</div>
                <div className="feature-desc">Security guards scan visitor passes directly with any camera.</div>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div className="feature-title">Fast Visitor Clearance</div>
                <div className="feature-desc">Staff and HR approve visitors with a single click.</div>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <Clock size={18} />
              </div>
              <div>
                <div className="feature-title">Overstay Alerts</div>
                <div className="feature-desc">Automatic alerts when visitors exceed permitted stay times.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="login-left-footer">
          <span>&copy; {new Date().getFullYear()} Vistara. Clean Enterprise Edition.</span>
          <span>Role-Based Access Control</span>
        </div>
      </section>

      {/* ---------------- Right Section: Simple Login Form ---------------- */}
      <section className="login-right">
        <button
          className="icon-btn theme-toggle-corner"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          type="button"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="login-form-container">
          <div className="login-header-group">
            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">Sign in to your Vistara workplace account.</p>
          </div>

          {errorMsg && (
            <div className="alert-message alert-error">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="alert-message alert-info">
              <CheckCircle2 size={18} />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="workEmail">Work Email</label>
              <input
                id="workEmail"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="workPassword">Password</label>
              <div className="input-password-wrapper">
                <input
                  id="workPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-extra-row">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '1rem', fontWeight: 700 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* South Indian Demo Accounts Pill Buttons */}
          <div className="demo-credentials-box">
            <div className="demo-title">
              <Lock size={14} />
              <span>1-Click Demo Accounts:</span>
            </div>
            <div className="demo-pills" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className="demo-pill-btn"
                onClick={() => fillDemo('reception@example.com', 'Receptionist (Priya Lakshmi)')}
              >
                1. Reception (Priya)
              </button>
              <button
                type="button"
                className="demo-pill-btn"
                onClick={() => fillDemo('staff@example.com', 'Staff (Karthik Raj)')}
              >
                2. Staff (Karthik)
              </button>
              <button
                type="button"
                className="demo-pill-btn"
                onClick={() => fillDemo('hr@example.com', 'HR (Meena Devi)')}
              >
                3. HR (Meena Devi)
              </button>
              <button
                type="button"
                className="demo-pill-btn"
                style={{ backgroundColor: 'var(--primary-50)', borderColor: 'var(--primary-500)', fontWeight: 700 }}
                onClick={() => fillDemo('security@example.com', 'Security (Vignesh Kumar)')}
              >
                4. Security (Vignesh)
              </button>
            </div>
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <button
                type="button"
                className="demo-pill-btn"
                style={{ width: '100%' }}
                onClick={() => fillDemo('admin@example.com', 'Admin (Arjun Kumar)')}
              >
                Admin (Arjun Kumar)
              </button>
            </div>
          </div>

          <div className="security-footer-note">
            <Lock size={13} />
            <span>Protected with role-based access control.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

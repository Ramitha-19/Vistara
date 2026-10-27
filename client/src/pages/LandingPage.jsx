import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  QrCode,
  Users,
  Clock,
  ArrowRight,
  Lock,
  Building2,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Top Header Navbar */}
      <nav
        style={{
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-card)',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2563eb, #1e3a8a)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Vistara
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--primary-600)', fontWeight: 600, marginLeft: 6, textTransform: 'uppercase' }}>
              Enterprise
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/status" style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Lookup Pass
          </Link>
          <Link to="/register-visit" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            Register Visit
          </Link>
          <Link to="/login" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            Staff Portal
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: '80px 24px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 999,
            backgroundColor: 'var(--primary-50)',
            color: 'var(--primary-700)',
            fontSize: '0.82rem',
            fontWeight: 600,
            marginBottom: 24,
            border: '1px solid var(--primary-200)',
          }}
        >
          <Building2 size={14} />
          <span>Next-Generation Corporate Facility Security</span>
        </div>

        <h1
          style={{
            fontSize: '3.2rem',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: 'var(--text-main)',
            marginBottom: 20,
          }}
        >
          Secure Every Entry.<br />Simplify Every Visit.
        </h1>

        <p
          style={{
            fontSize: '1.15rem',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            maxWidth: 680,
            margin: '0 auto 36px',
          }}
        >
          Vistara provides corporate offices, technology campuses, and commercial business centers with automated visitor registrations, host clearances, encrypted QR passes, real-time camera scanning, and server-side overstay alerts.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '1rem' }}>
            <span>Sign In to Workspace</span>
            <ArrowRight size={18} />
          </Link>

          <Link to="/register-visit" className="btn btn-secondary" style={{ padding: '12px 28px', fontSize: '1rem' }}>
            <span>Self-Register as Visitor</span>
          </Link>
        </div>
      </section>

      {/* Pillars Grid */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <div className="card">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <QrCode size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>Cryptographic QR Passes</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Unguessable, single-use tokens generated upon host employee approval. Validated via front desk webcams or handheld scanners.
            </p>
          </div>

          <div className="card">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Users size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>Instant Host Workflows</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Employees receive real-time notifications for incoming visitor requests. Approve or reject with customized notes in one click.
            </p>
          </div>

          <div className="card">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Clock size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>Server-Side Overstay Detection</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Continuous background daemon analyzes check-in duration. Immediately dispatches overdue alerts to facility security upon grace period expiration.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', padding: '24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        &copy; {new Date().getFullYear()} Vistara Enterprise Visitor Management System. All rights reserved.
      </footer>
    </div>
  );
}

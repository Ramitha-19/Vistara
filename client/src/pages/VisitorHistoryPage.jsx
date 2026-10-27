import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Layout from '../components/Layout';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  Building,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VisitorHistoryPage() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    loadVisits();
  }, [statusFilter, dateFilter]);

  const loadVisits = async () => {
    try {
      setLoading(true);
      let query = `?status=${statusFilter}`;
      if (dateFilter) query += `&date=${dateFilter}`;
      const data = await apiRequest(`/visits${query}`);
      setVisits(data.visits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = visits.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.visitorName.toLowerCase().includes(q) ||
      v.referenceNumber.toLowerCase().includes(q) ||
      v.organization.toLowerCase().includes(q) ||
      (v.host && v.host.name.toLowerCase().includes(q))
    );
  });

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Reference', 'Visitor', 'Organization', 'Host', 'Date', 'Arrival', 'Departure', 'CheckIn', 'CheckOut', 'Status'];
    const rows = filtered.map((v) => [
      v.referenceNumber,
      `"${v.visitorName}"`,
      `"${v.organization}"`,
      `"${v.host?.name || 'N/A'}"`,
      v.visitDate,
      v.expectedArrival,
      v.expectedDeparture,
      v.actualCheckInTime ? new Date(v.actualCheckInTime).toLocaleString() : 'N/A',
      v.actualCheckOutTime ? new Date(v.actualCheckOutTime).toLocaleString() : 'N/A',
      v.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vistara_visitor_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout
      title="Visitor Records &amp; Compliance Reports"
      subtitle="Complete Historical Audit Trail of All Scheduled, Active, and Completed Visits"
    >
      {/* Filters and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: 170 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="CheckedIn">Checked In</option>
            <option value="CheckedOut">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>

          <input
            type="date"
            className="form-input"
            style={{ width: 160 }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />

          {dateFilter && (
            <button className="btn btn-secondary" onClick={() => setDateFilter('')} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
              Clear Date
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Filter list..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Visitor</th>
                <th>Organization</th>
                <th>Host</th>
                <th>Date</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Status</th>
                <th>Pass</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((visit) => (
                  <tr key={visit._id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{visit.referenceNumber}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{visit.visitorName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{visit.visitorEmail}</div>
                    </td>
                    <td>{visit.organization}</td>
                    <td>{visit.host?.name || 'Unassigned'}</td>
                    <td>{visit.visitDate}</td>
                    <td>
                      {visit.actualCheckInTime
                        ? new Date(visit.actualCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>
                      {visit.actualCheckOutTime
                        ? new Date(visit.actualCheckOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${visit.status}`}>
                        {visit.isOverdue ? '⚠️ Overdue' : visit.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/status?ref=${visit.referenceNumber}`}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        View Pass
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                    No visits matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

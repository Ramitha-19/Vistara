import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import Layout from '../components/Layout';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'host',
    department: '',
    phone: '',
  });
  const [feedback, setFeedback] = useState({ msg: '', isError: false });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/users');
      setUsers(data.users);
    } catch (err) {
      setFeedback({ msg: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setFeedback({ msg: res.message, isError: false });
      setShowModal(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'host',
        department: '',
        phone: '',
      });
      loadUsers();
    } catch (err) {
      setFeedback({ msg: err.message, isError: true });
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await apiRequest(`/users/${user._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      setFeedback({ msg: `Account status updated for ${user.name}.`, isError: false });
      loadUsers();
    } catch (err) {
      setFeedback({ msg: err.message, isError: true });
    }
  };

  return (
    <Layout
      title="Employee &amp; Staff Access Management"
      subtitle="Provision and Manage Enterprise Hosts, Administrators, and Receptionist Accounts"
    >
      {feedback.msg && (
        <div className={`alert-message ${feedback.isError ? 'alert-error' : 'alert-info'}`} style={{ marginBottom: 20 }}>
          <AlertCircle size={18} />
          <span>{feedback.msg}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {users.length} active enterprise directory accounts
        </p>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={16} />
          <span>Add Employee Account</span>
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Work Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Contact</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge badge-Approved" style={{ textTransform: 'capitalize' }}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.department}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-CheckedIn' : 'badge-Rejected'}`}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      onClick={() => handleToggleStatus(u)}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Provision Staff Account</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)} style={{ width: 30, height: 30 }}>
                ×
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Work Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Temporary Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    required
                    minLength={6}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Role *</label>
                    <select
                      className="form-select"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="host">Host / Employee</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Engineering, HR"
                      value={newUser.department}
                      onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Direct Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers, createUser, updateUserRole, deleteUser, getActiveUsersCount, isUserActive } from '../services/userService';
import { UserProfile, UserRole } from '../types/user';
import { BackupManager } from './BackupManager';
import { ContractBuilder } from './ContractBuilder';

type AdminTab = 'users' | 'backup' | 'contract-builder';

export const UserManagement: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);

  // Create user form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');

  useEffect(() => {
    if (isAdmin()) {
      loadUsers();
      
      // Refresh active users count every 30 seconds
      const interval = setInterval(() => {
        getActiveUsersCount(30).then(count => {
          setActiveUsersCount(count);
        }).catch(err => {
          console.error('Error refreshing active users count:', err);
        });
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
      
      // Load active users count
      const activeCount = await getActiveUsersCount(30); // 30 minutes window
      setActiveUsersCount(activeCount);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate password length
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      await createUser(newEmail, newPassword, newRole, newDisplayName, currentUser!.uid);
      setSuccess(`User ${newEmail} created successfully! They can now log in with their email and password.`);
      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
      setNewRole('viewer');
      await loadUsers();
      
      // Note: User creation with signUp may sign out current user
      // In production, use backend API with admin privileges
      // For now, user will need to sign in with the new account
    } catch (err: any) {
      setError(err.message || 'Failed to create user. Please check the email and password.');
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateUserRole(uid, newRole);
      setSuccess('Role updated successfully!');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteUser(uid);
      setSuccess('User deleted successfully!');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  if (!isAdmin()) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h3>Access Denied</h3>
      <p>Only administrators can access user management.</p>
    </div>;
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return '#e53e3e';
      case 'editor': return '#3182ce';
      case 'viewer': return '#38a169';
      default: return '#718096';
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #E2E8F0' }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #0F2E6B' : '3px solid transparent',
            color: activeTab === 'users' ? '#0F2E6B' : '#64748B',
            fontSize: '0.9375rem',
            fontWeight: activeTab === 'users' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          👥 User Management
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'backup' ? '3px solid #0F2E6B' : '3px solid transparent',
            color: activeTab === 'backup' ? '#0F2E6B' : '#64748B',
            fontSize: '0.9375rem',
            fontWeight: activeTab === 'backup' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          💾 Backup & Restore
        </button>
        <button
          onClick={() => setActiveTab('contract-builder')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'contract-builder' ? '3px solid #0F2E6B' : '3px solid transparent',
            color: activeTab === 'contract-builder' ? '#0F2E6B' : '#64748B',
            fontSize: '0.9375rem',
            fontWeight: activeTab === 'contract-builder' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          📄 Contract Builder
        </button>
      </div>

      {activeTab === 'backup' ? (
        <BackupManager />
      ) : activeTab === 'contract-builder' ? (
        <ContractBuilder />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h2 style={{ margin: 0 }}>👥 User Management</h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#F0F4FF',
              border: '1px solid #D6E2FF',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#0F2E6B'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10B981',
                animation: 'pulse 2s infinite'
              }}></div>
              <span>{activeUsersCount} Active</span>
              <span style={{ color: '#64748B', fontWeight: '400' }}>•</span>
              <span style={{ color: '#64748B', fontWeight: '400' }}>{users.length} Total</span>
            </div>
          </div>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#5C6B82', maxWidth: '600px' }}>
            Create and manage team member accounts. <strong>Users must be created here before they can login.</strong> Share the email and password with team members after creation.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#0F2E6B',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(15, 46, 107, 0.2)',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#091B40';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#0F2E6B';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          + Add User
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '5px',
          color: '#c33'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: '#efe',
          border: '1px solid #cfc',
          borderRadius: '5px',
          color: '#3c3'
        }}>
          {success}
        </div>
      )}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>User</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Role</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Last Active</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Created</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const userIsActive = isUserActive(user.lastLogin, 30);
                const lastActiveTime = user.lastLogin 
                  ? new Date(user.lastLogin).toLocaleString()
                  : 'Never';
                
                return (
                <tr key={user.uid} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: userIsActive ? '#10B981' : '#94A3B8',
                        boxShadow: userIsActive ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
                        transition: 'all 0.3s ease'
                      }}></div>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: userIsActive ? '#10B981' : '#94A3B8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {userIsActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <strong>{user.displayName || 'N/A'}</strong>
                  </td>
                  <td style={{ padding: '1rem' }}>{user.email}</td>
                  <td style={{ padding: '1rem' }}>
                    {user.uid === currentUser?.uid ? (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        background: getRoleBadgeColor(user.role),
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: 'bold'
                      }}>
                        {user.role}
                      </span>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                        style={{
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '5px'
                        }}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748B' }}>
                    {lastActiveTime}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748B' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {user.uid !== currentUser?.uid && (
                      <button
                        onClick={() => handleDeleteUser(user.uid)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#fc8181',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>Create New User</h3>
            <p style={{ 
              marginBottom: '1.5rem', 
              fontSize: '0.875rem', 
              color: '#5C6B82',
              lineHeight: '1.5'
            }}>
              After creating a user, they will be able to login using the email and password you provide. 
              <strong style={{ display: 'block', marginTop: '0.5rem', color: '#DC2626' }}>
                ⚠️ Note: You will be signed out after creating a user. Please sign back in to continue.
              </strong>
            </p>
            
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Display Name</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                >
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="editor">Editor (Can create/edit)</option>
                  <option value="admin">Admin (Full access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
        </>
      )}
    </div>
  );
};

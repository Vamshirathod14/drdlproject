import { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Set base URL for axios
axios.defaults.baseURL = 'https://drdlproject-x131.onrender.com/api';

// Auth Components
const Login = ({ setToken, setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post('/login', { email, password });
      if (res.data.user.role !== 'admin') {
        throw new Error('Only administrators can access this panel');
      }
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Admin Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

const RegisterAdmin = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await axios.post('/admin/register', { 
        name, 
        email, 
        password 
      });
      setSuccess('Admin registration successful. You can now login.');
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Admin registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Register New Admin</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label>Email:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            minLength="6"
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register Admin'}
        </button>
      </form>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard">
      <h2>Admin Dashboard</h2>
      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p>{stats?.totalUsers || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Approvals</h3>
          <p>{stats?.pendingApprovals || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Active Inventories</h3>
          <p>{stats?.activeInventories || 0}</p>
        </div>
      </div>
    </div>
  );
};

// User Management Component
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/admin/pending-approvals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (userId, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/admin/approve-user/${userId}`, { action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${action} user`);
    }
  };

  const handleAssignInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/admin/approve-user/${selectedUser._id}`, { 
        action: 'approved',
        inventoryId 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAssignModal(false);
      setInventoryId('');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign inventory');
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="user-management">
      <h2>User Approvals</h2>
      
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Assign Inventory to {selectedUser?.name}</h3>
            <div className="form-group">
              <label>Inventory ID:</label>
              <input
                type="text"
                value={inventoryId}
                onChange={(e) => setInventoryId(e.target.value)}
                placeholder="Enter inventory ID (e.g., INV-1001)"
                required
              />
            </div>
            <div className="form-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button 
                className="submit-btn"
                onClick={handleAssignInventory}
                disabled={!inventoryId.trim()}
              >
                Assign Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <div className="no-users">No pending approvals</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.status}</td>
                <td className="actions">
                  <button
                    className="approve-btn"
                    onClick={() => {
                      if (user.role === 'holder') {
                        setSelectedUser(user);
                        setShowAssignModal(true);
                      } else {
                        handleApprove(user._id, 'approved');
                      }
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => handleApprove(user._id, 'rejected')}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Inventory Management Component
const InventoryManagement = () => {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newInventoryId, setNewInventoryId] = useState('');

  const fetchInventories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/admin/inventories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventories(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch inventories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventories();
  }, []);

  const handleCreateInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/admin/inventories', { inventoryId: newInventoryId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewInventoryId('');
      fetchInventories();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create inventory');
    }
  };

  if (loading) return <div className="loading">Loading inventories...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="inventory-management">
      <h2>Inventory Management</h2>
      
      <div className="create-inventory">
        <input
          type="text"
          value={newInventoryId}
          onChange={(e) => setNewInventoryId(e.target.value)}
          placeholder="Enter new inventory ID"
        />
        <button 
          className="create-btn"
          onClick={handleCreateInventory}
          disabled={!newInventoryId.trim()}
        >
          Create Inventory
        </button>
      </div>

      {inventories.length === 0 ? (
        <div className="no-inventories">No inventories found</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Inventory ID</th>
              <th>Holder</th>
              <th>Items Count</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {inventories.map((inventory) => (
              <tr key={inventory._id}>
                <td>{inventory.inventoryId}</td>
                <td>{inventory.holderId?.name || 'Unassigned'}</td>
                <td>{inventory.items?.length || 0}</td>
                <td>{new Date(inventory.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Request Management Component
const RequestManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/admin/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) return <div className="loading">Loading requests...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="request-management">
      <h2>Request Monitoring</h2>
      
      {requests.length === 0 ? (
        <div className="no-requests">No requests found</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Inventory</th>
              <th>Item Code</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request._id}>
                <td>{request.userId?.name}</td>
                <td>{request.inventoryId}</td>
                <td>{request.itemCode}</td>
                <td>{request.quantity}</td>
                <td className={`status-${request.status}`}>
                  {request.status}
                </td>
                <td>{new Date(request.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });

  const isAuthenticated = useMemo(() => {
    return token && user && user.role === 'admin';
  }, [token, user]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <Router>
      <div className="app">
        {isAuthenticated && (
          <header>
            <h1>Inventory Management System - Admin Panel</h1>
            <div className="user-info">
              <span>Logged in as: {user.name}</span>
            </div>
            <nav>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/users">User Approvals</Link>
              <Link to="/inventories">Inventory Management</Link>
              <Link to="/requests">Request Monitoring</Link>
              <Link to="/register-admin">Register New Admin</Link>
              <button onClick={handleLogout}>Logout</button>
            </nav>
          </header>
        )}
        
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? (
              <Login setToken={setToken} setUser={setUser} />
            ) : (
              <Navigate to="/dashboard" replace />
            )} 
          />
          
          <Route 
            path="/register-admin" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RegisterAdmin />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/users" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/inventories" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <InventoryManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/requests" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RequestManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/" 
            element={
              <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

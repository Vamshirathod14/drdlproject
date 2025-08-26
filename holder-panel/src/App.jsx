import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Set base URL for axios
axios.defaults.baseURL = 'https://drdlproject-x131.onrender.com/api';

// Auth Components
const Login = ({ setToken, setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/login', { email, password });
      if (res.data.user.role !== 'holder') {
        throw new Error('Only inventory holders can access this panel');
      }
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    }
  };

  return (
    <div className="auth-container">
      <h2>Inventory Holder Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Login</button>
      </form>
      <p>Don't have an account? <a href="/register">Register</a></p>
    </div>
  );
};

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/register', { 
        name, 
        email, 
        password, 
        role: 'holder'
      });
      setSuccess('Registration successful. Waiting for admin approval and inventory assignment.');
      setError('');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setSuccess('');
    }
  };

  return (
    <div className="auth-container">
      <h2>Inventory Holder Registration</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <a href="/login">Login</a></p>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!token || !user || user.role !== 'holder') {
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
        const res = await axios.get('/holder/inventory', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const requestsRes = await axios.get('/holder/requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setStats({
          totalItems: res.data?.items?.length || 0,
          pendingRequests: requestsRes.data?.length || 0,
          inventoryId: res.data?.inventoryId || 'Not assigned'
        });
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
      <h2>Dashboard</h2>
      <div className="inventory-info">
        <h3>Your Inventory ID: {stats.inventoryId}</h3>
      </div>
      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Items</h3>
          <p>{stats?.totalItems || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Requests</h3>
          <p>{stats?.pendingRequests || 0}</p>
        </div>
      </div>
    </div>
  );
};

// Items Management Component
const ItemsList = () => {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/holder/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventory(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleDelete = async (itemCode) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/holder/items/${itemCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInventory();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete item');
    }
  };

  const filteredItems = inventory?.items?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) return <div className="loading">Loading items...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!inventory) return <div className="error">Inventory not found</div>;

  return (
    <div className="items-container">
      <div className="header-row">
        <h2>My Inventory ({inventory.inventoryId})</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => {
            setEditItem(null);
            setShowAddForm(true);
          }}
          className="add-item-btn"
        >
          Add New Item
        </button>
      </div>

      {showAddForm && (
        <ItemForm 
          inventoryId={inventory.inventoryId}
          onClose={() => setShowAddForm(false)} 
          onSuccess={() => {
            setShowAddForm(false);
            fetchInventory();
          }} 
          item={editItem}
        />
      )}

      {filteredItems.length === 0 ? (
        <div className="no-items">
          {searchTerm ? 'No items match your search' : 'No items in inventory yet'}
        </div>
      ) : (
        <div className="items-grid">
          {filteredItems.map((item) => (
            <div key={item.code} className="item-card">
              <div className="item-image-container">
                {item.image ? (
                  <img 
                    src={`http://localhost:5000/${item.image}`} 
                    alt={item.name}
                    className="item-image"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                  />
                ) : (
                  <div className="image-placeholder">No Image</div>
                )}
              </div>
              <div className="item-details">
                <h3>{item.name}</h3>
                <p><strong>Code:</strong> {item.code}</p>
                <p><strong>Quantity:</strong> {item.quantity}</p>
                {item.calibrationInfo && <p><strong>Calibration:</strong> {item.calibrationInfo}</p>}
                {item.expiryInfo && <p><strong>Expiry:</strong> {item.expiryInfo}</p>}
              </div>
              <div className="item-actions">
                <button 
                  onClick={() => {
                    setEditItem(item);
                    setShowAddForm(true);
                  }}
                  className="edit-btn"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(item.code)}
                  className="delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ItemForm = ({ inventoryId, onClose, onSuccess, item }) => {
  const [name, setName] = useState(item?.name || '');
  const [code, setCode] = useState(item?.code || '');
  const [quantity, setQuantity] = useState(item?.quantity || 1);
  const [calibrationInfo, setCalibrationInfo] = useState(item?.calibrationInfo || '');
  const [expiryInfo, setExpiryInfo] = useState(item?.expiryInfo || '');
  const [image, setImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(item?.image || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', name);
      formData.append('code', code);
      formData.append('quantity', quantity);
      formData.append('calibrationInfo', calibrationInfo);
      formData.append('expiryInfo', expiryInfo);
      if (image) formData.append('image', image);

      if (item) {
        // Update existing item
        await axios.put(`/holder/items/${item.code}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // Create new item
        await axios.post('/holder/items', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{item ? 'Edit Item' : 'Add New Item'}</h3>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name:</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Code:</label>
            <input 
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              required 
              disabled={!!item}
            />
          </div>
          <div className="form-group">
            <label>Quantity:</label>
            <input 
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(parseInt(e.target.value))} 
              min="1" 
              required 
            />
          </div>
          <div className="form-group">
            <label>Calibration Info:</label>
            <input 
              type="text" 
              value={calibrationInfo} 
              onChange={(e) => setCalibrationInfo(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Expiry Info:</label>
            <input 
              type="text" 
              value={expiryInfo} 
              onChange={(e) => setExpiryInfo(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Image:</label>
            <div className="image-upload-container">
              <label className="file-upload-label">
                Choose Image
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="file-upload-input"
                />
              </label>
              {(previewImage || item?.image) && (
                <div className="image-preview">
                  <img 
                    src={previewImage || `http://localhost:5000/${item.image}`} 
                    alt="Preview" 
                  />
                </div>
              )}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Requests Management Component
const RequestsList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/holder/requests', {
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

  const handleAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/holder/requests/${requestId}/action`, { action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${action} request`);
    }
  };

  const filteredRequests = requests.filter(request => 
    filter === 'all' ? true : request.status === filter
  );

  if (loading) return <div className="loading">Loading requests...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="requests-container">
      <div className="requests-header">
        <h2>Item Requests</h2>
        <div className="filter-controls">
          <button 
            className={filter === 'pending' ? 'active' : ''}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={filter === 'issued' ? 'active' : ''}
            onClick={() => setFilter('issued')}
          >
            Issued
          </button>
          <button 
            className={filter === 'rejected' ? 'active' : ''}
            onClick={() => setFilter('rejected')}
          >
            Rejected
          </button>
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
        </div>
      </div>
      
      {filteredRequests.length === 0 ? (
        <div className="no-requests">No {filter === 'all' ? '' : filter} requests found</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Item Code</th>
              <th>Quantity</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((request) => (
              <tr key={request._id} className={`status-${request.status}`}>
                <td>{request.userId?.name}</td>
                <td>{request.itemCode}</td>
                <td>{request.quantity}</td>
                <td>{new Date(request.timestamp).toLocaleString()}</td>
                <td>
                  <span className={`status-badge ${request.status}`}>
                    {request.status}
                  </span>
                </td>
                <td>
                  {request.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleAction(request._id, 'issued')}
                        className="approve-btn"
                      >
                        Issue
                      </button>
                      <button 
                        onClick={() => handleAction(request._id, 'rejected')}
                        className="reject-btn"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {request.status !== 'pending' && (
                    <span className="action-completed">
                      {request.status === 'issued' ? 'Issued' : 'Rejected'} on {new Date(request.status === 'issued' ? request.issuedAt : request.rejectedAt).toLocaleDateString()}
                    </span>
                  )}
                </td>
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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || null));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <Router>
      <div className="app">
        {token && user && (
          <header>
            <h1>DRDL Inventory </h1>
            <div className="user-info">
              <span>Inventory ID: {user.inventoryId || 'Not assigned'}</span>
              <span>Welcome, {user.name}</span>
            </div>
            <nav>
              <a href="/dashboard">Dashboard</a>
              <a href="/items">My Items</a>
              <a href="/requests">Requests</a>
              <button onClick={handleLogout}>Logout</button>
            </nav>
          </header>
        )}
        
        <Routes>
          <Route path="/login" element={!token ? <Login setToken={setToken} setUser={setUser} /> : <Navigate to="/dashboard" replace />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/items" element={
            <ProtectedRoute>
              <ItemsList />
            </ProtectedRoute>
          } />
          
          <Route path="/requests" element={
            <ProtectedRoute>
              <RequestsList />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

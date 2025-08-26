import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { ClipLoader } from 'react-spinners';

// Set base URL for axios
axios.defaults.baseURL = 'https://drdlproject-x131.onrender.com/api';

// Custom Loading Component
const Loading = () => (
  <div className="loading-overlay">
    <ClipLoader color="#2c3e50" size={50} />
  </div>
);

// Welcome Page Component
const WelcomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const slides = [
    {
      title: "Welcome to Inventory Management System",
      description: "Efficiently manage your inventory with our comprehensive solution",
      image: "/images/slide1.jpeg"
    },
    {
      title: "Track Your Items",
      description: "Keep track of all your inventory items in one place",
      image: "/images/slide2.webp"
    },
    {
      title: "Easy Requests",
      description: "Request items with just a few clicks",
      image: "/images/slide3.jpg"
    }
  ];

  useEffect(() => {
    // Simulate image loading
    const imageLoadPromises = slides.map(slide => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = slide.image;
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    Promise.all(imageLoadPromises).then(() => {
      setLoading(false);
    });

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  if (loading) return <Loading />;

  return (
    <div className="welcome-page">
      <ToastContainer position="top-right" autoClose={3000} />
      {/* Header */}
      <header className="welcome-header">
        <h1>Inventory Management System</h1>
        <nav>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </nav>
      </header>

      {/* Marquee */}
      <div className="marquee">
        <marquee behavior="scroll" direction="left">
          Welcome to our Inventory Management System! New features coming soon. Stay tuned for updates.
        </marquee>
      </div>

      {/* Carousel */}
      <div className="carousel">
        {slides.map((slide, index) => (
          <div 
            key={index}
            className={`slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="slide-content">
              <h2>{slide.title}</h2>
              <p>{slide.description}</p>
            </div>
          </div>
        ))}
        <div className="carousel-controls">
          {slides.map((_, index) => (
            <button 
              key={index}
              className={index === currentSlide ? 'active' : ''}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="features">
        <h2>Key Features</h2>
        <div className="feature-cards">
          <div className="feature-card">
            <h3>Inventory Tracking</h3>
            <p>Track all your inventory items in real-time</p>
          </div>
          <div className="feature-card">
            <h3>Easy Requests</h3>
            <p>Request items with just a few clicks</p>
          </div>
          <div className="feature-card">
            <h3>User Management</h3>
            <p>Manage different user roles and permissions</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="welcome-footer">
        <p>&copy; {new Date().getFullYear()} Inventory Management System. All rights reserved.</p>
        <div className="footer-links">
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
};

// Auth Components
const Login = ({ setToken, setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('/login', { email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Login successful!');
      setTimeout(() => navigate('/inventories'), 1000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? <ClipLoader color="#fff" size={20} /> : 'Login'}
        </button>
      </form>
      <p>Don't have an account? <Link to="/register">Register</Link></p>
    </div>
  );
};

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/register', { name, email, password, role });
      toast.success('Registration successful. Waiting for admin approval.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2>Register</h2>
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
        <div>
          <label>Role:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">User</option>
            <option value="holder">Inventory Holder</option>
          </select>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? <ClipLoader color="#fff" size={20} /> : 'Register'}
        </button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!token || !user) {
    toast.info('Please login to access this page');
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// User Components
const InventoriesList = () => {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInventories = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/user/inventories', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInventories(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch inventories');
        toast.error(err.response?.data?.error || 'Failed to fetch inventories');
      } finally {
        setLoading(false);
      }
    };

    fetchInventories();
  }, []);

  if (loading) return <Loading />;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="inventories-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2>Available Inventories</h2>
      <div className="inventory-cards">
        {inventories.map((inventory) => (
          <div key={inventory._id} className="inventory-card">
            <h3>Inventory {inventory.inventoryId || inventory._id}</h3>
            <Link to={`/inventories/${inventory.inventoryId || inventory._id}/items`}>View Items</Link>
          </div>
        ))}
      </div>
    </div>
  );
};

const ItemsList = () => {
  const { inventoryId } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);

  const placeholderSVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
      <rect width="100%" height="100%" fill="#e0e0e0"/>
      <text x="50%" y="50%" fill="#666" font-family="Arial" text-anchor="middle" dy=".3em">No Image</text>
    </svg>`
  )}`;

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/user/inventory/${inventoryId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setItems(res.data.items || []);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to fetch items');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [inventoryId]);

  const handleRequest = async (itemCode, quantity = 1) => {
    setRequestLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/user/request', { 
        inventoryId, 
        itemCode, 
        quantity 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Request submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="items-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2>Items in Inventory {inventoryId}</h2>
      <div className="items-grid">
        {items.map((item) => (
          <div key={item.code} className="item-card">
            <div className="item-image-container">
              <img 
                src={item.image ? `http://localhost:5000/${item.image}` : placeholderSVG}
                alt={item.name}
                onError={(e) => {
                  e.target.src = placeholderSVG;
                  e.target.onerror = null;
                }}
              />
            </div>
            <h3>{item.name}</h3>
            <p>Code: {item.code}</p>
            <p>Quantity: {item.quantity}</p>
            {item.calibrationInfo && <p>Calibration: {item.calibrationInfo}</p>}
            {item.expiryInfo && <p>Expiry: {item.expiryInfo}</p>}
            <button 
              onClick={() => handleRequest(item.code)} 
              disabled={requestLoading}
            >
              {requestLoading ? <ClipLoader color="#fff" size={15} /> : 'Request Item'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/user/requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRequests(res.data);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to fetch requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="requests-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2>My Requests</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request._id}>
              <td>{request.itemCode}</td>
              <td>{request.quantity}</td>
              <td className={`status-${request.status}`}>{request.status}</td>
              <td>{new Date(request.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Main App Component
const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <Router>
      <div className="app">
        <ToastContainer position="top-right" autoClose={3000} />
        {token && user && (
          <header>
            <h1>Inventory Management System - {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Panel</h1>
            <nav>
              {user.role === 'user' && (
                <>
                  <Link to="/inventories">Inventories</Link>
                  <Link to="/requests">My Requests</Link>
                </>
              )}
              <button onClick={handleLogout}>Logout</button>
            </nav>
          </header>
        )}
        
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={!token ? <Login setToken={setToken} setUser={setUser} /> : <Navigate to="/inventories" replace />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/inventories" replace />} />
          
          <Route path="/inventories" element={
            <ProtectedRoute>
              <InventoriesList />
            </ProtectedRoute>
          } />
          
          <Route path="/inventories/:inventoryId/items" element={
            <ProtectedRoute>
              <ItemsList />
            </ProtectedRoute>
          } />
          
          <Route path="/requests" element={
            <ProtectedRoute>
              <UserRequests />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

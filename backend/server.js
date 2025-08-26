const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Atlas connection
mongoose.connect(process.env.MONGODB_URI || 'disconnected',
   )
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));

// Models
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['user', 'holder', 'admin'], default: 'user' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  inventoryId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}));

const Inventory = mongoose.model('Inventory', new mongoose.Schema({
  inventoryId: { type: String, unique: true },
  holderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    name: String,
    code: { type: String, unique: true },
    quantity: Number,
    calibrationInfo: String,
    expiryInfo: String,
    image: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
}));

const Request = mongoose.model('Request', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inventoryId: String,
  itemCode: String,
  quantity: { type: Number, default: 1 },
  status: { type: String, enum: ['pending', 'issued', 'rejected'], default: 'pending' },
  timestamp: { type: Date, default: Date.now },
  issuedAt: Date,
  rejectedAt: Date,
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}));

const Log = mongoose.model('Log', new mongoose.Schema({
  action: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  inventoryId: String,
  itemCode: String,
  timestamp: { type: Date, default: Date.now }
}));

// Image upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Middleware
const authenticate = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).send('Access denied');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ims_secret_key');
    req.user = await User.findById(decoded._id);
    if (!req.user) return res.status(401).send('Invalid token');
    next();
  } catch (err) {
    res.status(400).send('Invalid token');
  }
};

const authorize = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).send('Access denied');
  }
  next();
};

// Routes

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Prevent regular users from registering as admin
    if (role === 'admin' && req.body.adminSecret !== process.env.ADMIN_REGISTER_SECRET) {
      return res.status(403).send('Admin registration requires special access');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      status: role === 'admin' ? 'approved' : 'pending'
    });
    
    await user.save();
    
    if (role === 'admin') {
      const log = new Log({
        action: 'Admin registered',
        userId: user._id
      });
      await log.save();
    }
    
    res.status(201).send({ 
      message: role === 'admin' ? 
        'Admin registered successfully' : 
        'Registration successful. Waiting for approval.' 
    });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).send('Invalid credentials');
    }
    
    if (user.status !== 'approved') {
      return res.status(403).send('Account not approved yet');
    }
    
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'ims_secret_key', { expiresIn: '1d' });
    res.send({ 
      token, 
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        inventoryId: user.inventoryId 
      } 
    });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Admin Routes
app.post('/api/admin/register', async (req, res) => {
  try {
    const { name, email, password, secret } = req.body;
    
    if (secret !== process.env.ADMIN_REGISTER_SECRET) {
      return res.status(403).send('Invalid admin registration secret');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      status: 'approved'
    });
    
    await user.save();
    
    const log = new Log({
      action: 'Admin registered',
      userId: user._id
    });
    await log.save();
    
    res.status(201).send({ message: 'Admin registered successfully' });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/api/admin/pending-approvals', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' });
    res.send(users);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.post('/api/admin/approve-user/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, inventoryId } = req.body;
    
    const user = await User.findById(id);
    if (!user) return res.status(404).send('User not found');
    
    user.status = action;
    if (action === 'approved' && user.role === 'holder' && inventoryId) {
      user.inventoryId = inventoryId;
      
      const existingInventory = await Inventory.findOne({ inventoryId });
      if (!existingInventory) {
        const inventory = new Inventory({
          inventoryId,
          holderId: user._id
        });
        await inventory.save();
      } else {
        existingInventory.holderId = user._id;
        await existingInventory.save();
      }
    }
    
    await user.save();
    
    const log = new Log({
      action: `User ${action}`,
      userId: user._id,
      handledBy: req.user._id
    });
    await log.save();
    
    res.send({ message: `User ${action} successfully`, user });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/api/admin/inventories', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const inventories = await Inventory.find().populate('holderId', 'name email');
    res.send(inventories);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.post('/api/admin/inventories', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { inventoryId } = req.body;
    
    const existingInventory = await Inventory.findOne({ inventoryId });
    if (existingInventory) {
      return res.status(400).send('Inventory ID already exists');
    }
    
    const inventory = new Inventory({ inventoryId });
    await inventory.save();
    
    res.status(201).send(inventory);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.delete('/api/admin/inventories/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const inventory = await Inventory.findByIdAndDelete(id);
    
    if (!inventory) {
      return res.status(404).send('Inventory not found');
    }
    
    // Update any holders assigned to this inventory
    await User.updateMany(
      { inventoryId: inventory.inventoryId },
      { $set: { inventoryId: null } }
    );
    
    res.send({ message: 'Inventory deleted successfully' });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/api/admin/requests', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('userId', 'name email')
      .populate('handledBy', 'name email')
      .sort({ timestamp: -1 });
    res.send(requests);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/api/admin/stats', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const pendingApprovals = await User.countDocuments({ status: 'pending' });
    const activeInventories = await Inventory.countDocuments({});
    const totalItems = await Inventory.aggregate([
      { $unwind: '$items' },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);
    const recentRequests = await Request.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    res.send({
      totalUsers,
      pendingApprovals,
      activeInventories,
      totalItems: totalItems[0]?.count || 0,
      recentRequests
    });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/api/admin/logs', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const logs = await Log.find()
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(100);
    res.send(logs);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Inventory Holder Routes
app.get('/api/holder/inventory', authenticate, authorize(['holder']), async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ holderId: req.user._id });
    if (!inventory) {
      return res.status(404).send('Inventory not found');
    }
    res.send(inventory);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.post('/api/holder/items', authenticate, authorize(['holder']), upload.single('image'), async (req, res) => {
  try {
    const { name, code, quantity, calibrationInfo, expiryInfo } = req.body;
    const inventory = await Inventory.findOne({ holderId: req.user._id });
    
    if (!inventory) return res.status(404).send('Inventory not found');
    
    // Check if item code already exists
    const existingItem = inventory.items.find(item => item.code === code);
    if (existingItem) {
      return res.status(400).send('Item code already exists');
    }
    
    inventory.items.push({
      name,
      code,
      quantity: parseInt(quantity),
      calibrationInfo,
      expiryInfo,
      image: req.file ? req.file.path : null
    });
    
    await inventory.save();
    
    const log = new Log({
      action: 'Item added',
      userId: req.user._id,
      inventoryId: inventory.inventoryId,
      itemCode: code
    });
    await log.save();
    
    res.send({ message: 'Item added successfully', item: inventory.items[inventory.items.length - 1] });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.put('/api/holder/items/:code', authenticate, authorize(['holder']), upload.single('image'), async (req, res) => {
  try {
    const { code } = req.params;
    const { name, quantity, calibrationInfo, expiryInfo } = req.body;
    
    const inventory = await Inventory.findOne({ holderId: req.user._id });
    if (!inventory) return res.status(404).send('Inventory not found');
    
    const itemIndex = inventory.items.findIndex(item => item.code === code);
    if (itemIndex === -1) return res.status(404).send('Item not found');
    
    inventory.items[itemIndex].name = name || inventory.items[itemIndex].name;
    inventory.items[itemIndex].quantity = quantity ? parseInt(quantity) : inventory.items[itemIndex].quantity;
    inventory.items[itemIndex].calibrationInfo = calibrationInfo || inventory.items[itemIndex].calibrationInfo;
    inventory.items[itemIndex].expiryInfo = expiryInfo || inventory.items[itemIndex].expiryInfo;
    
    if (req.file) {
      inventory.items[itemIndex].image = req.file.path;
    }
    
    await inventory.save();
    
    const log = new Log({
      action: 'Item updated',
      userId: req.user._id,
      inventoryId: inventory.inventoryId,
      itemCode: code
    });
    await log.save();
    
    res.send({ message: 'Item updated successfully', item: inventory.items[itemIndex] });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.delete('/api/holder/items/:code', authenticate, authorize(['holder']), async (req, res) => {
  try {
    const { code } = req.params;
    const inventory = await Inventory.findOne({ holderId: req.user._id });
    
    if (!inventory) return res.status(404).send('Inventory not found');
    
    const itemIndex = inventory.items.findIndex(item => item.code === code);
    if (itemIndex === -1) return res.status(404).send('Item not found');
    
    inventory.items.splice(itemIndex, 1);
    await inventory.save();
    
    const log = new Log({
      action: 'Item deleted',
      userId: req.user._id,
      inventoryId: inventory.inventoryId,
      itemCode: code
    });
    await log.save();
    
    res.send({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/api/holder/requests', authenticate, authorize(['holder']), async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ holderId: req.user._id });
    if (!inventory) return res.status(404).send('Inventory not found');
    
    const requests = await Request.find({ 
      inventoryId: inventory.inventoryId
    })
    .populate('userId', 'name email')
    .sort({ timestamp: -1 });
    
    res.send(requests);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.post('/api/holder/requests/:id/action', authenticate, authorize(['holder']), async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    
    const request = await Request.findById(id);
    if (!request) return res.status(404).send('Request not found');
    
    const inventory = await Inventory.findOne({ inventoryId: request.inventoryId });
    if (!inventory) return res.status(404).send('Inventory not found');
    
    const item = inventory.items.find(i => i.code === request.itemCode);
    if (!item) return res.status(404).send('Item not found');
    
    if (action === 'issued') {
      if (item.quantity < request.quantity) {
        return res.status(400).send('Insufficient quantity');
      }
      
      item.quantity -= request.quantity;
      request.status = 'issued';
      request.issuedAt = new Date();
      request.handledBy = req.user._id;
      
      const log = new Log({
        action: 'Item issued',
        userId: request.userId,
        inventoryId: inventory.inventoryId,
        itemCode: request.itemCode
      });
      await log.save();
    } else if (action === 'rejected') {
      request.status = 'rejected';
      request.rejectedAt = new Date();
      request.handledBy = req.user._id;
      
      const log = new Log({
        action: 'Request rejected',
        userId: request.userId,
        inventoryId: inventory.inventoryId,
        itemCode: request.itemCode
      });
      await log.save();
    }
    
    await inventory.save();
    await request.save();
    
    res.send({ message: `Request ${action} successfully`, request });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// User Routes
app.get('/api/user/inventories', authenticate, authorize(['user']), async (req, res) => {
  try {
    const inventories = await Inventory.find({}, 'inventoryId holderId')
      .populate('holderId', 'name');
    res.send(inventories);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/api/user/inventory/:id', authenticate, authorize(['user']), async (req, res) => {
  try {
    const { id } = req.params;
    const inventory = await Inventory.findOne(
      { inventoryId: id }, 
      'inventoryId holderId items.name items.code items.quantity items.calibrationInfo items.expiryInfo items.image'
    ).populate('holderId', 'name email');
    
    if (!inventory) return res.status(404).send('Inventory not found');
    
    res.send(inventory);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.post('/api/user/request', authenticate, authorize(['user']), async (req, res) => {
  try {
    const { inventoryId, itemCode, quantity } = req.body;
    
    const inventory = await Inventory.findOne({ inventoryId });
    if (!inventory) return res.status(404).send('Inventory not found');
    
    const item = inventory.items.find(i => i.code === itemCode);
    if (!item) return res.status(404).send('Item not found');
    
    if (item.quantity < quantity) {
      return res.status(400).send('Insufficient quantity');
    }
    
    const request = new Request({
      userId: req.user._id,
      inventoryId,
      itemCode,
      quantity
    });
    
    await request.save();
    
    const log = new Log({
      action: 'Request created',
      userId: req.user._id,
      inventoryId,
      itemCode
    });
    await log.save();
    
    res.send({ message: 'Request submitted successfully', request });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get('/api/user/requests', authenticate, authorize(['user']), async (req, res) => {
  try {
    const requests = await Request.find({ userId: req.user._id })
      .populate('handledBy', 'name')
      .sort({ timestamp: -1 });
    res.send(requests);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
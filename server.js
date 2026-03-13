/**
 * Maison Élara — Restaurant Backend Server
 * Node.js + Express + MongoDB Atlas (Mongoose)
 *
 * LOCAL:  Copy .env.example to .env, fill in your MONGODB_URI, then: node server.js
 * RENDER: Set MONGODB_URI and ADMIN_PASSWORD as environment variables in the dashboard
 *
 * http://localhost:3000        → Customer site
 * http://localhost:3000/admin  → Admin panel
 */
 
require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const path     = require('path');
 
const app  = express();
const PORT = process.env.PORT || 3000;
 
// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname));
 
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
 
// ── MongoDB Connection ────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/maison-elara';
 
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    seedDatabase();
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Make sure MONGODB_URI is set correctly in your .env file');
    process.exit(1);
  });
 
// ── Mongoose Schemas & Models ─────────────────────────────────────────────────
const menuSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  category:    { type: String, required: true, enum: ['Breakfast','Lunch','Dinner','Drinks'] },
  price:       { type: Number, required: true },
  description: { type: String, required: true },
  image:       { type: String, default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80' },
  available:   { type: Boolean, default: true }
}, { timestamps: true });
 
const orderSchema = new mongoose.Schema({
  customerName:  { type: String, required: true },
  customerEmail: { type: String, required: true },
  items: [{
    menuItemId: mongoose.Schema.Types.ObjectId,
    name:       String,
    price:      Number,
    quantity:   Number
  }],
  total:  { type: Number, required: true },
  notes:  { type: String, default: '' },
  status: { type: String, default: 'pending', enum: ['pending','preparing','completed','cancelled'] }
}, { timestamps: true });
 
const reservationSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  email:  { type: String, required: true },
  phone:  { type: String, default: '' },
  date:   { type: String, required: true },
  time:   { type: String, required: true },
  guests: { type: String, required: true },
  notes:  { type: String, default: '' },
  status: { type: String, default: 'pending', enum: ['pending','confirmed','cancelled'] }
}, { timestamps: true });
 
const reviewSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true }
}, { timestamps: true });
 
const MenuItem    = mongoose.model('MenuItem',    menuSchema);
const Order       = mongoose.model('Order',       orderSchema);
const Reservation = mongoose.model('Reservation', reservationSchema);
const Review      = mongoose.model('Review',      reviewSchema);
 
// ── Auth ──────────────────────────────────────────────────────────────────────
const activeSessions = new Set();
let ADMIN_USER     = process.env.ADMIN_USERNAME || 'admin';
let ADMIN_PASS     = process.env.ADMIN_PASSWORD || 'maison2026';
 
// Recovery key — store this somewhere safe! Used to reset password without login.
const RECOVERY_KEY = process.env.RECOVERY_KEY || 'ELARA-RECOVERY-2026';
 
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
 
// ── AUTH Routes ───────────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = `tok_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    activeSessions.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
 
app.post('/api/admin/logout', authMiddleware, (req, res) => {
  activeSessions.delete(req.headers.authorization);
  res.json({ success: true });
});
 
// Change password (must be logged in)
app.post('/api/admin/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new password are required' });
  }
  if (currentPassword !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  ADMIN_PASS = newPassword;
  // Clear all sessions so everyone must re-login with new password
  activeSessions.clear();
  res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
});
 
// Recovery — reset password using recovery key (no login needed)
app.post('/api/admin/recover', (req, res) => {
  const { recoveryKey, newPassword } = req.body;
  if (!recoveryKey || !newPassword) {
    return res.status(400).json({ error: 'Recovery key and new password are required' });
  }
  if (recoveryKey !== RECOVERY_KEY) {
    return res.status(401).json({ error: 'Invalid recovery key' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  ADMIN_PASS = newPassword;
  activeSessions.clear();
  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
});
 
// ── MENU Routes ───────────────────────────────────────────────────────────────
app.get('/api/menu', async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const items = await MenuItem.find(filter).sort({ createdAt: 1 });
    res.json(items.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
app.post('/api/menu', authMiddleware, async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json(formatDoc(item));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
 
app.put('/api/menu/:id', authMiddleware, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(formatDoc(item));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
 
app.delete('/api/menu/:id', authMiddleware, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
 
// ── ORDER Routes ──────────────────────────────────────────────────────────────
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
app.post('/api/orders', async (req, res) => {
  try {
    const order = await Order.create(req.body);
    res.status(201).json(formatDoc(order));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
 
app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(formatDoc(order));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
 
// ── RESERVATION Routes ────────────────────────────────────────────────────────
app.get('/api/reservations', authMiddleware, async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    res.json(reservations.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
app.post('/api/reservations', async (req, res) => {
  try {
    const reservation = await Reservation.create(req.body);
    res.status(201).json(formatDoc(reservation));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
 
app.put('/api/reservations/:id', authMiddleware, async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    res.json(formatDoc(reservation));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
 
// ── REVIEW Routes ─────────────────────────────────────────────────────────────
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews.map(formatDoc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
app.post('/api/reviews', async (req, res) => {
  try {
    const review = await Review.create(req.body);
    res.status(201).json(formatDoc(review));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
 
// ── STATS Route ───────────────────────────────────────────────────────────────
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [totalOrders, completedOrders, reservationsToday, totalReviews, menuItems, pendingOrders] = await Promise.all([
      Order.countDocuments(),
      Order.find({ status: 'completed' }, 'total'),
      Reservation.countDocuments({ date: today }),
      Review.countDocuments(),
      MenuItem.countDocuments(),
      Order.countDocuments({ status: 'pending' })
    ]);
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    res.json({ totalOrders, totalRevenue: totalRevenue.toFixed(2), reservationsToday, totalReviews, menuItems, pendingOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// ── HTML Pages ────────────────────────────────────────────────────────────────
app.get('/',      (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
 
// ── Helper: convert MongoDB _id → id for frontend ────────────────────────────
function formatDoc(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id.toString();
  if (obj.createdAt instanceof Date) obj.createdAt = obj.createdAt.toISOString();
  return obj;
}
 
// ── Seed initial menu if empty ────────────────────────────────────────────────
async function seedDatabase() {
  const count = await MenuItem.countDocuments();
  if (count > 0) return;
  console.log('🌱 Seeding initial menu data...');
  await MenuItem.insertMany([
    { name: 'Eggs Benedict Royale',     category: 'Breakfast', price: 18.50, description: 'Poached eggs on toasted brioche with smoked salmon, hollandaise sauce, and fresh chives.',            image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400&q=80' },
    { name: 'Avocado Toast Deluxe',     category: 'Breakfast', price: 15.00, description: 'Sourdough toast with smashed avocado, cherry tomatoes, feta crumble, and a drizzle of truffle oil.',  image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400&q=80' },
    { name: 'French Omelette',          category: 'Breakfast', price: 14.00, description: 'Classic three-egg omelette with Gruyère, herbs de Provence, and a side of buttered toast.',           image: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400&q=80' },
    { name: 'Pan-Seared Sea Bass',      category: 'Lunch',     price: 28.00, description: 'Atlantic sea bass with lemon butter sauce, roasted fennel, and saffron risotto.',                    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80' },
    { name: 'Truffle Mushroom Risotto', category: 'Lunch',     price: 22.00, description: 'Arborio rice with wild mushrooms, black truffle shavings, parmesan, and fresh thyme.',               image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80' },
    { name: 'Burrata & Heirloom Salad', category: 'Lunch',     price: 19.00, description: 'Fresh burrata with heirloom tomatoes, basil oil, aged balsamic, and fleur de sel.',                  image: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&q=80' },
    { name: 'Wagyu Beef Tenderloin',    category: 'Dinner',    price: 68.00, description: '8oz A5 Wagyu with roasted bone marrow, pomme purée, red wine jus, and microgreens.',                 image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80' },
    { name: 'Duck Confit',              category: 'Dinner',    price: 42.00, description: 'Slow-cooked duck leg with cherry gastrique, lentil cassoulet, and crispy duck skin.',                 image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80' },
    { name: 'Lobster Thermidor',        category: 'Dinner',    price: 75.00, description: 'Half Maine lobster gratinéed with cognac cream, gruyère, and served with drawn butter.',              image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&q=80' },
    { name: 'Château Margaux Red',      category: 'Drinks',    price: 24.00, description: 'Glass of our house Bordeaux — full-bodied with notes of dark cherry, cedar, and vanilla.',            image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80' },
    { name: 'Elderflower Spritz',       category: 'Drinks',    price: 12.00, description: 'St-Germain elderflower liqueur with Prosecco, cucumber ribbon, and fresh mint.',                      image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400&q=80' },
    { name: 'Cold Brew Martini',        category: 'Drinks',    price: 16.00, description: 'Ketel One vodka, Kahlúa, cold brew concentrate, shaken until velvety and chilled.',                   image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80' }
  ]);
  console.log('✅ Menu seeded with 12 items');
}
 
// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🍽️  Maison Élara running at http://localhost:${PORT}`);
  console.log(`   Admin panel : http://localhost:${PORT}/admin`);
  console.log(`   Admin login : ${ADMIN_USER} / ${ADMIN_PASS}\n`);
});

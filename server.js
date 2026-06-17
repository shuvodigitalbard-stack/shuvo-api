const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDB } = require('./config/db');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/banners', require('./routes/banners'));

app.get('/api/health', (req, res) => {
  try {
    const { getAll } = require('./config/db');
    const users = getAll('SELECT COUNT(*) as count FROM users');
    const products = getAll('SELECT COUNT(*) as count FROM products');
    const orders = getAll('SELECT COUNT(*) as count FROM orders');
    res.json({ status: 'ok', database: 'sqlite', connected: true,
      stats: { users: users[0]?.count||0, products: products[0]?.count||0, orders: orders[0]?.count||0 },
      timestamp: new Date().toISOString() });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
});

app.get('/api', (req, res) => {
  res.json({ name: 'Shuvo API', version: '1.0.0',
    endpoints: { 'GET /api/health': 'Health check', 'POST /api/auth/register': 'Register', 'POST /api/auth/login': 'Login',
      'GET /api/products': 'List products', 'GET /api/categories': 'List categories', 'GET /api/banners': 'List banners' } });
});

const PORT = process.env.PORT || 5000;
initDB().then(() => {
  require('./seed');
  app.listen(PORT, () => console.log('Shuvo API running on port ' + PORT));
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });

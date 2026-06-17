const express = require('express');
const cors = require('cors');
const path = require('path');


const db = require('./config/db');

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT DEFAULT '',
    role TEXT DEFAULT 'customer',
    avatar TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    image TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    discount_price REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    category_id INTEGER,
    images TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    is_featured INTEGER DEFAULT 0,
    is_best_selling INTEGER DEFAULT 0,
    is_new_arrival INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    order_number TEXT UNIQUE NOT NULL,
    items TEXT NOT NULL DEFAULT '[]',
    subtotal REAL NOT NULL DEFAULT 0,
    shipping REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    order_status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    shipping_address TEXT DEFAULT '{}',
    tracking_number TEXT DEFAULT '',
    delivered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER,
    rating INTEGER NOT NULL DEFAULT 5,
    comment TEXT DEFAULT '',
    is_approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    image TEXT DEFAULT '',
    link TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('Database tables initialized');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/banners', require('./routes/banners'));

// Health check
app.get('/api/health', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get();
  res.json({
    status: 'ok',
    database: 'sqlite',
    connected: true,
    stats: {
      users: userCount.count,
      products: productCount.count,
      orders: orderCount.count
    },
    timestamp: new Date().toISOString()
  });
});

// API docs
app.get('/api', (req, res) => {
  res.json({
    name: 'Shuvo API',
    version: '1.0.0',
    endpoints: {
      'GET /api/health': 'Health check',
      'POST /api/auth/register': 'Register new user',
      'POST /api/auth/login': 'Login',
      'GET /api/auth/me': 'Get current user (auth required)',
      'GET /api/products': 'List products (public)',
      'GET /api/products/:slug': 'Get product by slug (public)',
      'POST /api/products': 'Create product (admin)',
      'PUT /api/products/:id': 'Update product (admin)',
      'DELETE /api/products/:id': 'Delete product (admin)',
      'GET /api/categories': 'List categories (public)',
      'POST /api/categories': 'Create category (admin)',
      'GET /api/orders': 'List orders (admin)',
      'POST /api/orders': 'Create order',
      'GET /api/orders/my': 'My orders (auth required)',
      'GET /api/banners': 'List active banners (public)',
      'GET /api/reviews/:product_id': 'Get product reviews (public)',
      'POST /api/reviews': 'Create review (auth required)'
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Shuvo API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');

console.log('Creating tables...');
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

console.log('Seeding data...');

// Admin user
const adminPass = bcrypt.hashSync('admin123', 12);
db.prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
  .run('Shuvo Admin', 'admin@shuvoapi.com', adminPass, 'admin');

// Demo user
const demoPass = bcrypt.hashSync('demo123', 12);
db.prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
  .run('Demo User', 'demo@shuvoapi.com', demoPass, 'customer');

// Categories
const categories = [
  { name: 'Electronics', slug: 'electronics', description: 'Gadgets and devices', sort_order: 1 },
  { name: 'Clothing', slug: 'clothing', description: 'Fashion and apparel', sort_order: 2 },
  { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Home essentials', sort_order: 3 },
  { name: 'Books', slug: 'books', description: 'Books and literature', sort_order: 4 },
  { name: 'Sports', slug: 'sports', description: 'Sports and fitness', sort_order: 5 },
  { name: 'Beauty', slug: 'beauty', description: 'Beauty and personal care', sort_order: 6 },
];
categories.forEach(c => {
  db.prepare('INSERT OR IGNORE INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)')
    .run(c.name, c.slug, c.description, c.sort_order);
});

// Products
const products = [
  { name: 'Wireless Bluetooth Headphones', slug: 'wireless-bt-headphones', description: 'Premium noise-cancelling wireless headphones with 30hr battery', price: 89.99, discount_price: 69.99, stock: 150, category_id: 1, is_featured: 1, is_best_selling: 1, rating: 4.5 },
  { name: 'Smart Watch Pro', slug: 'smart-watch-pro', description: 'Fitness tracker with heart rate monitor, GPS, and AMOLED display', price: 199.99, discount_price: 149.99, stock: 80, category_id: 1, is_featured: 1, is_new_arrival: 1, rating: 4.3 },
  { name: 'Portable Power Bank 20000mAh', slug: 'power-bank-20000', description: 'Fast charging power bank with USB-C and USB-A ports', price: 49.99, stock: 200, category_id: 1, is_best_selling: 1, rating: 4.7 },
  { name: 'Cotton T-Shirt Classic', slug: 'cotton-tshirt-classic', description: '100% organic cotton t-shirt, comfortable fit', price: 24.99, discount_price: 19.99, stock: 500, category_id: 2, is_featured: 1, rating: 4.2 },
  { name: 'Denim Jacket Vintage', slug: 'denim-jacket-vintage', description: 'Classic vintage-style denim jacket', price: 79.99, stock: 75, category_id: 2, is_new_arrival: 1, rating: 4.4 },
  { name: 'Running Shoes Ultra', slug: 'running-shoes-ultra', description: 'Lightweight running shoes with cushioned sole', price: 129.99, discount_price: 99.99, stock: 120, category_id: 5, is_featured: 1, is_best_selling: 1, rating: 4.6 },
  { name: 'Ceramic Coffee Mug Set', slug: 'ceramic-mug-set', description: 'Set of 4 premium ceramic mugs', price: 34.99, stock: 300, category_id: 3, rating: 4.1 },
  { name: 'LED Desk Lamp', slug: 'led-desk-lamp', description: 'Adjustable LED lamp with touch controls and USB charging', price: 44.99, discount_price: 34.99, stock: 180, category_id: 3, is_new_arrival: 1, rating: 4.3 },
  { name: 'Bestseller Novel Collection', slug: 'bestseller-novels', description: 'Collection of 5 bestselling novels', price: 59.99, stock: 100, category_id: 4, is_featured: 1, rating: 4.8 },
  { name: 'Yoga Mat Premium', slug: 'yoga-mat-premium', description: 'Non-slip yoga mat with alignment lines, 6mm thick', price: 39.99, stock: 250, category_id: 5, is_best_selling: 1, rating: 4.5 },
  { name: 'Organic Face Serum', slug: 'organic-face-serum', description: 'Vitamin C serum with hyaluronic acid', price: 29.99, discount_price: 22.99, stock: 400, category_id: 6, is_featured: 1, is_new_arrival: 1, rating: 4.4 },
  { name: 'Wireless Charging Pad', slug: 'wireless-charging-pad', description: 'Qi-compatible wireless charger for all devices', price: 29.99, stock: 350, category_id: 1, rating: 4.2 },
];
products.forEach(p => {
  db.prepare(
    `INSERT OR IGNORE INTO products (name, slug, description, price, discount_price, stock, category_id, is_featured, is_best_selling, is_new_arrival, rating, images, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    p.name, p.slug, p.description, p.price, p.discount_price || null, p.stock, p.category_id,
    p.is_featured ? 1 : 0, p.is_best_selling ? 1 : 0, p.is_new_arrival ? 1 : 0, p.rating || 0,
    JSON.stringify([`https://picsum.photos/seed/${p.slug}/600/400`]),
    JSON.stringify([p.slug.split('-')[0], 'featured'])
  );
});

// Banners
const banners = [
  { title: 'Summer Sale', subtitle: 'Up to 50% off on all electronics', link: '/products?category=electronics', sort_order: 1 },
  { title: 'New Arrivals', subtitle: 'Check out the latest products', link: '/products?new_arrival=true', sort_order: 2 },
  { title: 'Free Shipping', subtitle: 'On orders over $50', link: '/products', sort_order: 3 },
];
banners.forEach(b => {
  db.prepare('INSERT OR IGNORE INTO banners (title, subtitle, link, sort_order) VALUES (?, ?, ?, ?)')
    .run(b.title, b.subtitle, b.link, b.sort_order);
});

console.log('Seed complete!');
console.log('Admin: admin@shuvoapi.com / admin123');
console.log('Demo: demo@shuvoapi.com / demo123');
db.close();

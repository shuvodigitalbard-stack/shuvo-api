const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

(async () => {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new SQL.Database();

  db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, phone TEXT DEFAULT '', role TEXT DEFAULT 'customer', avatar TEXT DEFAULT '', is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT DEFAULT '', image TEXT DEFAULT '', is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT DEFAULT '', price REAL NOT NULL DEFAULT 0, discount_price REAL DEFAULT 0, stock INTEGER DEFAULT 0, category_id INTEGER, images TEXT DEFAULT '[]', tags TEXT DEFAULT '[]', is_active INTEGER DEFAULT 1, is_featured INTEGER DEFAULT 0, is_best_selling INTEGER DEFAULT 0, is_new_arrival INTEGER DEFAULT 0, rating REAL DEFAULT 0, review_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, order_number TEXT UNIQUE NOT NULL, items TEXT NOT NULL DEFAULT '[]', subtotal REAL NOT NULL DEFAULT 0, shipping REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, order_status TEXT DEFAULT 'pending', payment_status TEXT DEFAULT 'pending', shipping_address TEXT DEFAULT '{}', tracking_number TEXT DEFAULT '', delivered_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, user_id INTEGER, rating INTEGER NOT NULL DEFAULT 5, comment TEXT DEFAULT '', is_approved INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE banners (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, subtitle TEXT DEFAULT '', image TEXT DEFAULT '', link TEXT DEFAULT '', is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  console.log('Tables created');

  const adminPass = bcrypt.hashSync('admin123', 12);
  db.run('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)', ['Shuvo Admin', 'admin@shuvoapi.com', adminPass, 'admin']);
  const demoPass = bcrypt.hashSync('demo123', 12);
  db.run('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)', ['Demo User', 'demo@shuvoapi.com', demoPass, 'customer']);

  const cats = [
    ['Electronics', 'electronics', 'Gadgets and devices', 1],
    ['Clothing', 'clothing', 'Fashion and apparel', 2],
    ['Home & Kitchen', 'home-kitchen', 'Home essentials', 3],
    ['Books', 'books', 'Books and literature', 4],
    ['Sports', 'sports', 'Sports and fitness', 5],
    ['Beauty', 'beauty', 'Beauty and personal care', 6],
  ];
  cats.forEach(c => db.run('INSERT INTO categories (name,slug,description,sort_order) VALUES (?,?,?,?)', c));

  const prods = [
    ['Wireless Bluetooth Headphones', 'wireless-bt-headphones', 'Premium noise-cancelling wireless headphones with 30hr battery', 89.99, 69.99, 150, 1, 1, 1, 0, 4.5],
    ['Smart Watch Pro', 'smart-watch-pro', 'Fitness tracker with heart rate monitor, GPS, and AMOLED display', 199.99, 149.99, 80, 1, 1, 0, 1, 4.3],
    ['Portable Power Bank 20000mAh', 'power-bank-20000', 'Fast charging power bank with USB-C and USB-A ports', 49.99, null, 200, 1, 0, 1, 0, 4.7],
    ['Cotton T-Shirt Classic', 'cotton-tshirt-classic', '100% organic cotton t-shirt, comfortable fit', 24.99, 19.99, 500, 2, 1, 0, 0, 4.2],
    ['Denim Jacket Vintage', 'denim-jacket-vintage', 'Classic vintage-style denim jacket', 79.99, null, 75, 2, 0, 0, 1, 4.4],
    ['Running Shoes Ultra', 'running-shoes-ultra', 'Lightweight running shoes with cushioned sole', 129.99, 99.99, 120, 5, 1, 1, 0, 4.6],
    ['Ceramic Coffee Mug Set', 'ceramic-mug-set', 'Set of 4 premium ceramic mugs', 34.99, null, 300, 3, 0, 0, 0, 4.1],
    ['LED Desk Lamp', 'led-desk-lamp', 'Adjustable LED lamp with touch controls and USB charging', 44.99, 34.99, 180, 3, 0, 0, 1, 4.3],
    ['Bestseller Novel Collection', 'bestseller-novels', 'Collection of 5 bestselling novels', 59.99, null, 100, 4, 1, 0, 0, 4.8],
    ['Yoga Mat Premium', 'yoga-mat-premium', 'Non-slip yoga mat with alignment lines, 6mm thick', 39.99, null, 250, 5, 0, 1, 0, 4.5],
    ['Organic Face Serum', 'organic-face-serum', 'Vitamin C serum with hyaluronic acid', 29.99, 22.99, 400, 6, 1, 0, 1, 4.4],
    ['Wireless Charging Pad', 'wireless-charging-pad', 'Qi-compatible wireless charger for all devices', 29.99, null, 350, 1, 0, 0, 0, 4.2],
  ];
  prods.forEach(p => {
    db.run('INSERT INTO products (name,slug,description,price,discount_price,stock,category_id,is_featured,is_best_selling,is_new_arrival,rating,images,tags) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], JSON.stringify(['https://picsum.photos/seed/'+p[1]+'/600/400']), JSON.stringify([p[1].split('-')[0]])]);
  });

  const bans = [
    ['Summer Sale', 'Up to 50% off on all electronics', '/products?category=electronics', 1],
    ['New Arrivals', 'Check out the latest products', '/products?new_arrival=true', 2],
    ['Free Shipping', 'On orders over $50', '/products', 3],
  ];
  bans.forEach(b => db.run('INSERT INTO banners (title,subtitle,link,sort_order) VALUES (?,?,?,?)', b));

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('Seed complete! Admin: admin@shuvoapi.com / admin123 | Demo: demo@shuvoapi.com / demo123');
})();

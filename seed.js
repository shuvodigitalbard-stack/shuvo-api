const bcrypt = require('bcryptjs');
const { db, persist, run, getOne } = require('./config/db');

(async () => {
  // Clear existing data
  db().run('DELETE FROM users');
  db().run('DELETE FROM categories');
  db().run('DELETE FROM products');
  db().run('DELETE FROM banners');
  db().run('DELETE FROM reviews');
  db().run('DELETE FROM orders');

  console.log('Cleared existing data');

  const adminPass = bcrypt.hashSync('admin123', 12);
  run('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)', ['Shuvo Admin', 'admin@shuvoapi.com', adminPass, 'admin']);
  const demoPass = bcrypt.hashSync('demo123', 12);
  run('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)', ['Demo User', 'demo@shuvoapi.com', demoPass, 'customer']);

  const cats = [
    ['Electronics', 'electronics', 'Gadgets and devices', 1],
    ['Clothing', 'clothing', 'Fashion and apparel', 2],
    ['Home & Kitchen', 'home-kitchen', 'Home essentials', 3],
    ['Books', 'books', 'Books and literature', 4],
    ['Sports', 'sports', 'Sports and fitness', 5],
    ['Beauty', 'beauty', 'Beauty and personal care', 6],
  ];
  cats.forEach(c => run('INSERT INTO categories (name,slug,description,sort_order) VALUES (?,?,?,?)', c));

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
    run('INSERT INTO products (name,slug,description,price,discount_price,stock,category_id,is_featured,is_best_selling,is_new_arrival,rating,images,tags) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], JSON.stringify(['https://picsum.photos/seed/'+p[1]+'/600/400']), JSON.stringify([p[1].split('-')[0]])]);
  });

  const bans = [
    ['Summer Sale', 'Up to 50% off on all electronics', '/products?category=electronics', 1],
    ['New Arrivals', 'Check out the latest products', '/products?new_arrival=true', 2],
    ['Free Shipping', 'On orders over $50', '/products', 3],
  ];
  bans.forEach(b => run('INSERT INTO banners (title,subtitle,link,sort_order) VALUES (?,?,?,?)', b));

  try { persist(); } catch(e) { /* ignore on read-only fs */ }
  console.log('Seed complete! Admin: admin@shuvoapi.com / admin123 | Demo: demo@shuvoapi.com / demo123');
})();

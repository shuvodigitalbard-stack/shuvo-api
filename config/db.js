const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.SQLITE_DB || path.join(__dirname, '..', 'data.db');
let sqlDb;

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  sqlDb.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, phone TEXT DEFAULT '', role TEXT DEFAULT 'customer',
    avatar TEXT DEFAULT '', is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  sqlDb.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '', image TEXT DEFAULT '', is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  sqlDb.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '', price REAL NOT NULL DEFAULT 0, discount_price REAL DEFAULT 0,
    stock INTEGER DEFAULT 0, category_id INTEGER, images TEXT DEFAULT '[]', tags TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1, is_featured INTEGER DEFAULT 0, is_best_selling INTEGER DEFAULT 0,
    is_new_arrival INTEGER DEFAULT 0, rating REAL DEFAULT 0, review_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  sqlDb.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, order_number TEXT UNIQUE NOT NULL,
    items TEXT NOT NULL DEFAULT '[]', subtotal REAL NOT NULL DEFAULT 0, shipping REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0, order_status TEXT DEFAULT 'pending', payment_status TEXT DEFAULT 'pending',
    shipping_address TEXT DEFAULT '{}', tracking_number TEXT DEFAULT '', delivered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  sqlDb.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, user_id INTEGER,
    rating INTEGER NOT NULL DEFAULT 5, comment TEXT DEFAULT '', is_approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  sqlDb.run(`CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, subtitle TEXT DEFAULT '',
    image TEXT DEFAULT '', link TEXT DEFAULT '', is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  try { persist(); } catch(e) { /* ignore on read-only fs */ }
  console.log('SQLite tables initialized');
  return sqlDb;
}

function persist() {
  const data = sqlDb.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function db() {
  if (!sqlDb) throw new Error('Call initDB() first');
  return sqlDb;
}

// Helper: run SQL and return lastInsertRowId
function run(sql, params = []) {
  db().run(sql, params);
  try { persist(); } catch(e) { /* ignore on read-only fs */ }
  const res = db().exec('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: res[0]?.values[0]?.[0] || 0 };
}

// Helper: get first row
function getOne(sql, params = []) {
  const res = db().exec(sql, params);
  if (!res.length || !res[0].values.length) return null;
  const obj = {};
  res[0].columns.forEach((c, i) => obj[c] = res[0].values[0][i]);
  return obj;
}

// Helper: get all rows
function getAll(sql, params = []) {
  const res = db().exec(sql, params);
  if (!res.length) return [];
  return res[0].values.map(vals => {
    const obj = {};
    res[0].columns.forEach((c, i) => obj[c] = vals[i]);
    return obj;
  });
}

module.exports = { initDB, db, persist, run, getOne, getAll };

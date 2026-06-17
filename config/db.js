const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.SQLITE_DB || path.join(__dirname, '..', 'data.db');

// Ensure directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('SQLite connected:', dbPath);
module.exports = db;

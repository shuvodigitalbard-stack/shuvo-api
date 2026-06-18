const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne, getAll, run, db, persist } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'shuvo-dev-secret-2026';
const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = getOne('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (e) { res.status(401).json({ message: 'Invalid token' }); }
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, password required' });
    const exists = getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const hp = await bcrypt.hash(password, 12);
    // Use db() directly to avoid persist() issues on read-only filesystems
    db().run('INSERT INTO users (name, email, password, phone) VALUES (?,?,?,?)', [name, email, hp, phone||'']);
    const user = getOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(500).json({ message: 'User creation failed' });
    try { persist(); } catch(e) { /* ignore persist errors on read-only fs */ }
    res.status(201).json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, token: generateToken(user.id) });
  } catch (e) { res.status(500).json({ message: e.message || 'Registration failed' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = getOne('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, token: generateToken(user.id) });
  } catch (e) { res.status(500).json({ message: e.message || 'Login failed' }); }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email, phone: req.user.phone, role: req.user.role });
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;

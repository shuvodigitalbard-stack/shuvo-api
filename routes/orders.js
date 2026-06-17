const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('./auth');

const generateOrderNumber = () => {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
};

// POST /api/orders - create order
router.post('/', async (req, res) => {
  try {
    const { items, subtotal, shipping, total, shipping_address } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items required' });
    }
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shuvo-dev-secret-2026');
        userId = decoded.id;
      } catch(e) {}
    }
    const orderNumber = generateOrderNumber();
    const result = db.prepare(
      'INSERT INTO orders (user_id, order_number, items, subtotal, shipping, total, shipping_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, orderNumber, JSON.stringify(items), subtotal, shipping || 0, total, JSON.stringify(shipping_address || {}));
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders/my - get user orders
router.get('/my', authMiddleware, (req, res) => {
  try {
    const orders = db.prepare(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id);
    orders.forEach(o => { try { o.items = JSON.parse(o.items); } catch(e) { o.items = []; } });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders - admin all orders
router.get('/', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { status, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (status) { sql += ' WHERE order_status = ?'; params.push(status); }
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countSql).get(...params);
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));
    const orders = db.prepare(sql).all(...params);
    orders.forEach(o => { try { o.items = JSON.parse(o.items); } catch(e) { o.items = []; } });
    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders/stats - admin dashboard stats
router.get('/stats', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_status = 'pending'").get().count;
    const deliveredOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_status = 'delivered'").get().count;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE payment_status = 'paid'").get().sum;
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE date(created_at) = ?').get(today).count;
    const todayRevenue = db.prepare("SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE date(created_at) = ? AND payment_status = 'paid'").get(today).sum;
    res.json({ totalOrders, pendingOrders, deliveredOrders, totalRevenue, todayOrders, todayRevenue });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/orders/:id/status - admin update status
router.put('/:id/status', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { order_status, payment_status, tracking_number } = req.body;
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Order not found' });
    const updates = [];
    const params = [];
    if (order_status) { updates.push('order_status = ?'); params.push(order_status); }
    if (payment_status) { updates.push('payment_status = ?'); params.push(payment_status); }
    if (tracking_number !== undefined) { updates.push('tracking_number = ?'); params.push(tracking_number); }
    if (order_status === 'delivered') { updates.push('delivered_at = CURRENT_TIMESTAMP'); }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders/:id
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    try { order.items = JSON.parse(order.items); } catch(e) { order.items = []; }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

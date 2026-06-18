const express = require('express');
const router = express.Router();
const { getAll, getOne, run } = require('../config/db');
const { authMiddleware } = require('./auth');

const generateOrderNumber = () => 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2,6).toUpperCase();

router.post('/', async (req, res) => {
  try {
    const { items, subtotal, shipping, total, shipping_address } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Items required' });
    let userId = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) { try { const jwt = require('jsonwebtoken'); const d = jwt.verify(token, process.env.JWT_SECRET||'shuvo-dev-secret-2026'); userId = d.id; } catch(e) {} }
    const on = generateOrderNumber();
    const r = run('INSERT INTO orders (user_id,order_number,items,subtotal,shipping,total,shipping_address) VALUES (?,?,?,?,?,?,?)', [userId, on, JSON.stringify(items), subtotal, shipping||0, total, JSON.stringify(shipping_address||{})]);
    res.status(201).json(getOne('SELECT * FROM orders WHERE id = ?', [r.lastInsertRowid]));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/my', authMiddleware, (req, res) => {
  try {
    const orders = getAll('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    orders.forEach(o => { try { o.items = JSON.parse(o.items); } catch(e) { o.items = []; } });
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { status, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (status) { sql += ' WHERE order_status = ?'; params.push(status); }
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const row = getAll(countSql, params); const total = row.length ? (row[0].count || 0) : 0;
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page)-1)*Number(limit));
    const orders = getAll(sql, params);
    orders.forEach(o => { try { o.items = JSON.parse(o.items); } catch(e) { o.items = []; } });
    res.json({ orders, total, page: Number(page), pages: Math.ceil(total/limit) });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/stats', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const totalOrders = getAll('SELECT COUNT(*) as c FROM orders')[0].c;
    const pendingOrders = getAll('SELECT COUNT(*) as c FROM orders WHERE order_status = ?', ['pending'])[0].c;
    const deliveredOrders = getAll('SELECT COUNT(*) as c FROM orders WHERE order_status = ?', ['delivered'])[0].c;
    const rev = getAll("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE payment_status = ?", ['paid']);
    const totalRevenue = rev[0]?.s || 0;
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = getAll('SELECT COUNT(*) as c FROM orders WHERE date(created_at) = ?', [today])[0].c;
    const todayRev = getAll("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE date(created_at) = ? AND payment_status = ?", [today, 'paid']);
    const todayRevenue = todayRev[0]?.s || 0;
    res.json({ totalOrders, pendingOrders, deliveredOrders, totalRevenue, todayOrders, todayRevenue });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id/status', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { order_status, payment_status, tracking_number } = req.body;
    const sets = [];
    const params = [];
    if (order_status) { sets.push('order_status = ?'); params.push(order_status); }
    if (payment_status) { sets.push('payment_status = ?'); params.push(payment_status); }
    if (tracking_number !== undefined) { sets.push('tracking_number = ?'); params.push(tracking_number); }
    if (order_status === 'delivered') sets.push('delivered_at = CURRENT_TIMESTAMP');
    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    run('UPDATE orders SET ' + sets.join(',') + ' WHERE id = ?', params);
    res.json(getOne('SELECT * FROM orders WHERE id = ?', [req.params.id]));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const order = getOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    try { order.items = JSON.parse(order.items); } catch(e) { order.items = []; }
    res.json(order);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

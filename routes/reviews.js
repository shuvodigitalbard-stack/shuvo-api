const express = require('express');
const router = express.Router();
const { getAll, getOne, run } = require('../config/db');
const { authMiddleware } = require('./auth');

router.get('/:product_id', (req, res) => {
  try {
    const reviews = getAll('SELECT r.*, u.name as user_name FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = ? AND r.is_approved = 1 ORDER BY r.created_at DESC', [req.params.product_id]);
    res.json(reviews);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    if (!product_id || !rating) return res.status(400).json({ message: 'Product ID and rating required' });
    run('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?,?,?,?)', [product_id, req.user.id, Math.min(5,Math.max(1,rating)), comment||'']);
    const review = getOne('SELECT r.*, u.name as user_name FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT 1', [product_id]);
    const stats = getAll('SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM reviews WHERE product_id = ? AND is_approved = 1', [product_id]);
    if (stats[0]) run('UPDATE products SET rating = ?, review_count = ? WHERE id = ?', [Math.round(stats[0].avg_r*10)/10, stats[0].cnt, product_id]);
    res.status(201).json(review);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

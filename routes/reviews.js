const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('./auth');

// GET /api/reviews/:product_id - public
router.get('/:product_id', (req, res) => {
  try {
    const reviews = db.prepare(
      'SELECT r.*, u.name as user_name, u.avatar as user_avatar FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = ? AND r.is_approved = 1 ORDER BY r.created_at DESC'
    ).all(req.params.product_id);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/reviews - auth required
router.post('/', authMiddleware, (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    if (!product_id || !rating) return res.status(400).json({ message: 'Product ID and rating required' });
    const result = db.prepare(
      'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)'
    ).run(product_id, req.user.id, Math.min(5, Math.max(1, rating)), comment || '');
    // Update product rating
    const stats = db.prepare(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ? AND is_approved = 1'
    ).get(product_id);
    db.prepare('UPDATE products SET rating = ?, review_count = ? WHERE id = ?')
      .run(Math.round(stats.avg_rating * 10) / 10, stats.count, product_id);
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('./auth');

// GET /api/banners - public (active only)
router.get('/', (req, res) => {
  try {
    const banners = db.prepare(
      'SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC'
    ).all();
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/banners - admin
router.post('/', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { title, subtitle, image, link, sort_order } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });
    const result = db.prepare(
      'INSERT INTO banners (title, subtitle, image, link, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(title, subtitle || '', image || '', link || '', sort_order || 0);
    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/banners/:id - admin
router.put('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Banner not found' });
    const { title, subtitle, image, link, sort_order, is_active } = req.body;
    db.prepare(
      'UPDATE banners SET title = ?, subtitle = ?, image = ?, link = ?, sort_order = ?, is_active = ? WHERE id = ?'
    ).run(
      title || existing.title, subtitle !== undefined ? subtitle : existing.subtitle,
      image !== undefined ? image : existing.image, link !== undefined ? link : existing.link,
      sort_order !== undefined ? sort_order : existing.sort_order,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      req.params.id
    );
    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/banners/:id - admin
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
    res.json({ message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

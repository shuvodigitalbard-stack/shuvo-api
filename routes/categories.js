const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('./auth');

// GET /api/categories - public
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(
      'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC'
    ).all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/categories/:slug - public
router.get('/:slug', (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/categories - admin
router.post('/', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { name, slug, description, image, sort_order } = req.body;
    if (!name || !slug) return res.status(400).json({ message: 'Name and slug required' });
    const result = db.prepare(
      'INSERT INTO categories (name, slug, description, image, sort_order) VALUES (?, ?, ?, ?, ?)'
    ).run(name, slug, description || '', image || '', sort_order || 0);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/categories/:id - admin
router.put('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { name, slug, description, image, sort_order, is_active } = req.body;
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Category not found' });
    db.prepare(
      'UPDATE categories SET name = ?, slug = ?, description = ?, image = ?, sort_order = ?, is_active = ? WHERE id = ?'
    ).run(
      name || existing.name,
      slug || existing.slug,
      description !== undefined ? description : existing.description,
      image !== undefined ? image : existing.image,
      sort_order !== undefined ? sort_order : existing.sort_order,
      is_active !== undefined ? is_active : existing.is_active,
      req.params.id
    );
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/categories/:id - admin
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

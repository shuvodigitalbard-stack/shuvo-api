const express = require('express');
const router = express.Router();
const { getAll, getOne, run } = require('../config/db');
const { authMiddleware } = require('./auth');

router.get('/', (req, res) => {
  try { res.json(getAll('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC')); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:slug', (req, res) => {
  try {
    const c = getOne('SELECT * FROM categories WHERE slug = ?', [req.params.slug]);
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json(c);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { name, slug, description, image, sort_order } = req.body;
    if (!name || !slug) return res.status(400).json({ message: 'Name and slug required' });
    const r = run('INSERT INTO categories (name, slug, description, image, sort_order) VALUES (?,?,?,?,?)', [name, slug, description||'', image||'', sort_order||0]);
    res.status(201).json(getOne('SELECT * FROM categories WHERE id = ?', [r.lastInsertRowid]));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const existing = getOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const { name, slug, description, image, sort_order, is_active } = req.body;
    run('UPDATE categories SET name=?, slug=?, description=?, image=?, sort_order=?, is_active=? WHERE id=?',
      [name||existing.name, slug||existing.slug, description??existing.description, image??existing.image, sort_order??existing.sort_order, is_active??existing.is_active, req.params.id]);
    res.json(getOne('SELECT * FROM categories WHERE id = ?', [req.params.id]));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

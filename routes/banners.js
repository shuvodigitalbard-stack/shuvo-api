const express = require('express');
const router = express.Router();
const { getAll, getOne, run } = require('../config/db');
const { authMiddleware } = require('./auth');

router.get('/', (req, res) => {
  try { res.json(getAll('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC')); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { title, subtitle, image, link, sort_order } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });
    const r = run('INSERT INTO banners (title,subtitle,image,link,sort_order) VALUES (?,?,?,?,?)', [title, subtitle||'', image||'', link||'', sort_order||0]);
    res.status(201).json(getOne('SELECT * FROM banners WHERE id = ?', [r.lastInsertRowid]));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const e = getOne('SELECT * FROM banners WHERE id = ?', [req.params.id]);
    if (!e) return res.status(404).json({ message: 'Not found' });
    const { title, subtitle, image, link, sort_order, is_active } = req.body;
    run('UPDATE banners SET title=?,subtitle=?,image=?,link=?,sort_order=?,is_active=? WHERE id=?', [title||e.title, subtitle??e.subtitle, image??e.image, link??e.link, sort_order??e.sort_order, is_active!==undefined?(is_active?1:0):e.is_active, req.params.id]);
    res.json(getOne('SELECT * FROM banners WHERE id = ?', [req.params.id]));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    run('DELETE FROM banners WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

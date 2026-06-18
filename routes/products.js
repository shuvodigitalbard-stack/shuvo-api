const express = require('express');
const router = express.Router();
const { getAll, getOne, run } = require('../config/db');
const { authMiddleware } = require('./auth');

router.get('/', (req, res) => {
  try {
    const { category, search, sort, page = 1, limit = 20, featured, best_selling, new_arrival, min_price, max_price } = req.query;
    let sql = 'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1';
    const params = [];
    if (category) { sql += ' AND c.slug = ?'; params.push(category); }
    if (featured === 'true') sql += ' AND p.is_featured = 1';
    if (best_selling === 'true') sql += ' AND p.is_best_selling = 1';
    if (new_arrival === 'true') sql += ' AND p.is_new_arrival = 1';
    if (min_price || max_price) { sql += ' AND p.price >= ? AND p.price <= ?'; params.push(Number(min_price)||0, Number(max_price)||999999); }
    if (search) { sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push('%'+search+'%', '%'+search+'%'); }
    const countSql = sql.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as count FROM');
    const row = getAll(countSql, params); const total = row.length ? (row[0].count || 0) : 0;
    switch (sort) {
      case 'price_asc': sql += ' ORDER BY p.price ASC'; break;
      case 'price_desc': sql += ' ORDER BY p.price DESC'; break;
      case 'rating': sql += ' ORDER BY p.rating DESC'; break;
      default: sql += ' ORDER BY p.created_at DESC';
    }
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page)-1) * Number(limit));
    const products = getAll(sql, params);
    products.forEach(p => { try { p.images = JSON.parse(p.images); } catch(e) { p.images = []; } try { p.tags = JSON.parse(p.tags); } catch(e) { p.tags = []; } });
    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/featured', (req, res) => {
  try {
    const products = getAll('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1 AND p.is_featured = 1 LIMIT 12');
    products.forEach(p => { try { p.images = JSON.parse(p.images); } catch(e) { p.images = []; } });
    res.json({ products });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:slug', (req, res) => {
  try {
    const product = getOne('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ? AND p.is_active = 1', [req.params.slug]);
    if (!product) return res.status(404).json({ message: 'Not found' });
    try { product.images = JSON.parse(product.images); } catch(e) { product.images = []; }
    res.json(product);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { name, slug, description, price, discount_price, stock, category_id, images, tags, is_featured, is_best_selling, is_new_arrival } = req.body;
    if (!name || !slug || !price) return res.status(400).json({ message: 'Name, slug, price required' });
    const r = run('INSERT INTO products (name,slug,description,price,discount_price,stock,category_id,images,tags,is_featured,is_best_selling,is_new_arrival) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [name, slug, description||'', Number(price), discount_price?Number(discount_price):null, stock||0, category_id||null, JSON.stringify(images||[]), JSON.stringify(tags||[]), is_featured?1:0, is_best_selling?1:0, is_new_arrival?1:0]);
    res.status(201).json(getOne('SELECT * FROM products WHERE id = ?', [r.lastInsertRowid]));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const e = getOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!e) return res.status(404).json({ message: 'Not found' });
    const { name, slug, description, price, discount_price, stock, category_id, images, tags, is_featured, is_best_selling, is_new_arrival, is_active } = req.body;
    run('UPDATE products SET name=?,slug=?,description=?,price=?,discount_price=?,stock=?,category_id=?,images=?,tags=?,is_featured=?,is_best_selling=?,is_new_arrival=?,is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name||e.name, slug||e.slug, description??e.description, price!==undefined?Number(price):e.price, discount_price!==undefined?Number(discount_price):e.discount_price, stock!==undefined?stock:e.stock, category_id!==undefined?category_id:e.category_id, images?JSON.stringify(images):e.images, tags?JSON.stringify(tags):e.tags, is_featured!==undefined?(is_featured?1:0):e.is_featured, is_best_selling!==undefined?(is_best_selling?1:0):e.is_best_selling, is_new_arrival!==undefined?(is_new_arrival?1:0):e.is_new_arrival, is_active!==undefined?(is_active?1:0):e.is_active, req.params.id]);
    res.json(getOne('SELECT * FROM products WHERE id = ?', [req.params.id]));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;

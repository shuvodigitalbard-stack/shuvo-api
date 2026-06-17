const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('./auth');

// GET /api/products - public
router.get('/', (req, res) => {
  try {
    const {
      category, search, sort, page = 1, limit = 20,
      featured, best_selling, new_arrival, min_price, max_price
    } = req.query;

    let sql = 'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1';
    const params = [];

    if (category) {
      sql += ' AND c.slug = ?';
      params.push(category);
    }
    if (featured === 'true') {
      sql += ' AND p.is_featured = 1';
    }
    if (best_selling === 'true') {
      sql += ' AND p.is_best_selling = 1';
    }
    if (new_arrival === 'true') {
      sql += ' AND p.is_new_arrival = 1';
    }
    if (min_price || max_price) {
      sql += ' AND p.price >= ? AND p.price <= ?';
      params.push(Number(min_price) || 0, Number(max_price) || 999999);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Count
    const countSql = sql.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM');
    const { total } = db.prepare(countSql).get(...params);

    // Sort
    switch (sort) {
      case 'price_asc': sql += ' ORDER BY p.price ASC'; break;
      case 'price_desc': sql += ' ORDER BY p.price DESC'; break;
      case 'rating': sql += ' ORDER BY p.rating DESC'; break;
      default: sql += ' ORDER BY p.created_at DESC';
    }

    // Pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const products = db.prepare(sql).all(...params);
    // Parse JSON fields
    products.forEach(p => {
      try { p.images = JSON.parse(p.images); } catch(e) { p.images = []; }
      try { p.tags = JSON.parse(p.tags); } catch(e) { p.tags = []; }
    });

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/products/featured - public
router.get('/featured', (req, res) => {
  try {
    const products = db.prepare(
      'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1 AND p.is_featured = 1 LIMIT 12'
    ).all();
    products.forEach(p => { try { p.images = JSON.parse(p.images); } catch(e) { p.images = []; } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/products/:slug - public
router.get('/:slug', (req, res) => {
  try {
    const product = db.prepare(
      'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ? AND p.is_active = 1'
    ).get(req.params.slug);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    try { product.images = JSON.parse(product.images); } catch(e) { product.images = []; }
    try { product.tags = JSON.parse(product.tags); } catch(e) { product.tags = []; }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/products - admin
router.post('/', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { name, slug, description, price, discount_price, stock, category_id, images, tags, is_featured, is_best_selling, is_new_arrival } = req.body;
    if (!name || !slug || !price) return res.status(400).json({ message: 'Name, slug, and price required' });
    const result = db.prepare(
      `INSERT INTO products (name, slug, description, price, discount_price, stock, category_id, images, tags, is_featured, is_best_selling, is_new_arrival)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      name, slug, description || '', Number(price), discount_price ? Number(discount_price) : null,
      stock || 0, category_id || null, JSON.stringify(images || []), JSON.stringify(tags || []),
      is_featured ? 1 : 0, is_best_selling ? 1 : 0, is_new_arrival ? 1 : 0
    );
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/products/:id - admin
router.put('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Product not found' });
    const { name, slug, description, price, discount_price, stock, category_id, images, tags, is_featured, is_best_selling, is_new_arrival, is_active } = req.body;
    db.prepare(
      `UPDATE products SET name = ?, slug = ?, description = ?, price = ?, discount_price = ?, stock = ?, category_id = ?,
       images = ?, tags = ?, is_featured = ?, is_best_selling = ?, is_new_arrival = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(
      name || existing.name, slug || existing.slug, description !== undefined ? description : existing.description,
      price !== undefined ? Number(price) : existing.price, discount_price !== undefined ? Number(discount_price) : existing.discount_price,
      stock !== undefined ? stock : existing.stock, category_id !== undefined ? category_id : existing.category_id,
      images ? JSON.stringify(images) : existing.images, tags ? JSON.stringify(tags) : existing.tags,
      is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
      is_best_selling !== undefined ? (is_best_selling ? 1 : 0) : existing.is_best_selling,
      is_new_arrival !== undefined ? (is_new_arrival ? 1 : 0) : existing.is_new_arrival,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      req.params.id
    );
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/products/:id - admin
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

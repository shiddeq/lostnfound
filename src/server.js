const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname).toLowerCase();
      cb(null, crypto.randomUUID() + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, !!ALLOWED_TYPES[file.mimetype]),
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);

// ---- Items ----
app.get('/api/items', (req, res) => {
  const { type, q } = req.query;
  let sql = 'SELECT * FROM items';
  const where = [];
  const params = [];
  if (type === 'lost' || type === 'found') {
    where.push('type = ?');
    params.push(type);
  }
  if (q) {
    where.push('(title LIKE ? OR description LIKE ? OR location LIKE ? OR category LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY created_at DESC, id DESC';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const messages = db.prepare('SELECT * FROM messages WHERE item_id = ? ORDER BY created_at ASC, id ASC').all(item.id);
  res.json({ ...item, messages });
});

app.post('/api/items', upload.single('image'), (req, res) => {
  const { type, title, description, category, location, date_text, contact_name, contact_email, contact_phone } = req.body;
  if (!['lost', 'found'].includes(type)) return res.status(400).json({ error: 'type must be "lost" or "found"' });
  if (!clean(title)) return res.status(400).json({ error: 'title is required' });
  if (!clean(contact_name)) return res.status(400).json({ error: 'contact name is required' });
  if (!contact_email && !contact_phone) {
    return res.status(400).json({ error: 'provide at least an email or a phone number' });
  }

  const info = db
    .prepare(
      `INSERT INTO items (type, title, description, category, location, date_text, contact_name, contact_email, contact_phone, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      type,
      clean(title, 150),
      clean(description, 3000),
      clean(category, 60),
      clean(location, 150),
      clean(date_text, 40),
      clean(contact_name, 100),
      clean(contact_email, 150),
      clean(contact_phone, 40),
      req.file ? '/uploads/' + req.file.filename : ''
    );
  res.status(201).json({ id: info.lastInsertRowid });
});

app.delete('/api/items/:id', (req, res) => {
  const item = db.prepare('SELECT image FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  db.prepare('DELETE FROM messages WHERE item_id = ?').run(item.id);
  db.prepare('DELETE FROM items WHERE id = ?').run(item.id);
  if (item.image) {
    const p = path.join(uploadsDir, path.basename(item.image));
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  res.json({ ok: true });
});

// ---- Messages (chat / contact per item) ----
app.post('/api/items/:id/messages', (req, res) => {
  const item = db.prepare('SELECT id FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const { sender_name, body } = req.body;
  if (!clean(sender_name)) return res.status(400).json({ error: 'your name is required' });
  if (!clean(body)) return res.status(400).json({ error: 'message is required' });
  const info = db
    .prepare('INSERT INTO messages (item_id, sender_name, body) VALUES (?, ?, ?)')
    .run(item.id, clean(sender_name, 100), clean(body, 2000));
  res.status(201).json({ id: info.lastInsertRowid });
});

// Uploaded images
app.get('/uploads/:file', (req, res) => {
  res.sendFile(path.join(uploadsDir, path.basename(req.params.file)));
});

app.listen(PORT, () => {
  console.log(`Lost & Found running at http://localhost:${PORT}`);
});

const db = require('../db');

async function list(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM timetable ORDER BY id DESC LIMIT 100');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function create(req, res) {
  const { class_name, day, start_time, end_time, subject } = req.body;
  try {
    const [result] = await db.query('INSERT INTO timetable (class_name, day, start_time, end_time, subject) VALUES (?, ?, ?, ?, ?)', [class_name, day, start_time, end_time, subject]);
    const [rows] = await db.query('SELECT * FROM timetable WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getById(req, res) {
  const id = req.params.id;
  try {
    const [rows] = await db.query('SELECT * FROM timetable WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function update(req, res) {
  const id = req.params.id;
  const { class_name, day, start_time, end_time, subject } = req.body;
  try {
    await db.query('UPDATE timetable SET class_name=?, day=?, start_time=?, end_time=?, subject=? WHERE id=?', [class_name, day, start_time, end_time, subject, id]);
    const [rows] = await db.query('SELECT * FROM timetable WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function remove(req, res) {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM timetable WHERE id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

module.exports = { list, create, getById, update, remove };

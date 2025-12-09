const express = require('express');
const cors = require('cors');
const timetableRouter = require('./routes/timetable');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/timetable', timetableRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const barterRoutes = require('./routes/barterRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Izinkan request dari Vercel & localhost
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Limit 15MB agar upload foto base64 dari frontend tidak ditolak server
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ success: true, message: 'RE:V Backend API aktif dan berjalan normal!' });
});

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ success: true, status: 'connected', database: 'MySQL Railway OK' });
  } catch (error) {
    res.status(500).json({ success: false, status: 'disconnected', error: error.message });
  }
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/barter', barterRoutes);
app.use('/api/chat', chatRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server RE:V Backend berjalan di port ${PORT}`);
});
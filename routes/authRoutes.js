const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/auth/users - Ambil daftar seluruh user (tanpa password)
router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nama, email, foto_profil, lokasi, phone, rating, role, created_at FROM users'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data user', error: error.message });
  }
});

// POST /api/auth/register - Daftar akun mahasiswa baru
router.post('/register', async (req, res) => {
  const { id, nama, email, password, lokasi, foto_profil, phone } = req.body;
  try {
    if (!nama || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const userId = id || `USR-${Date.now().toString().slice(-6)}`;
    const defaultAvatar = foto_profil || '/assets/seed-images/avatar-placeholder.svg';
    const userLokasi = lokasi || 'Kampus UNNES';

    await db.query(
      `INSERT INTO users (id, nama, email, password, foto_profil, lokasi, phone, rating, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, 5.0, 'user')`,
      [userId, nama, email, password, defaultAvatar, userLokasi, phone || '']
    );

    const newUser = {
      id: userId,
      nama,
      email,
      foto_profil: defaultAvatar,
      lokasi: userLokasi,
      phone: phone || '',
      rating: 5.0,
      role: 'user'
    };

    res.status(201).json({ success: true, message: 'Registrasi berhasil!', user: newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mendaftarkan akun', error: error.message });
  }
});

// POST /api/auth/login - Login user / admin
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email tidak ditemukan' });
    }

    const user = rows[0];
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Password salah' });
    }

    const { password: _, ...safeUser } = user;
    res.json({ success: true, message: 'Login berhasil!', user: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal melakukan login', error: error.message });
  }
});

// PUT /api/auth/users/:id - Update profil pengguna
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { nama, lokasi, foto_profil, phone } = req.body;
  try {
    await db.query(
      `UPDATE users 
       SET nama = COALESCE(?, nama),
           lokasi = COALESCE(?, lokasi),
           foto_profil = COALESCE(?, foto_profil),
           phone = COALESCE(?, phone)
       WHERE id = ?`,
      [nama, lokasi, foto_profil, phone, id]
    );

    const [updated] = await db.query(
      'SELECT id, nama, email, foto_profil, lokasi, phone, rating, role FROM users WHERE id = ?',
      [id]
    );
    res.json({ success: true, message: 'Profil diperbarui', user: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui profil', error: error.message });
  }
});

module.exports = router;
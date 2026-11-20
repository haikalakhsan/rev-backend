const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/barter - Ambil semua penawaran barter
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM offers ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data penawaran barter', error: error.message });
  }
});

// POST /api/barter - Buat penawaran barter baru
router.post('/', async (req, res) => {
  const { id, item_ditawarkan, item_diminta, id_pengirim, id_penerima, selisih_harga } = req.body;
  try {
    const offerId = id || `OFR-${Date.now().toString().slice(-6)}`;

    await db.query(
      `INSERT INTO offers (id, item_ditawarkan, item_diminta, status, id_pengirim, id_penerima, selisih_harga)
       VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
      [offerId, item_ditawarkan, item_diminta, id_pengirim, id_penerima, selisih_harga || 0]
    );

    const notifId = `NTF-${Date.now().toString().slice(-6)}`;
    await db.query(
      `INSERT INTO notifications (id, id_user, tipe, teks, waktu, sudah_dibaca)
       VALUES (?, ?, 'barter', 'Kamu menerima penawaran barter baru!', 'Baru saja', 0)`,
      [notifId, id_penerima]
    );

    res.status(201).json({ success: true, message: 'Penawaran barter berhasil dikirim!', offerId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal membuat penawaran barter', error: error.message });
  }
});

// PUT /api/barter/:id/status - Terima atau tolak penawaran barter
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await db.query('UPDATE offers SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: `Status barter diubah menjadi ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengubah status barter', error: error.message });
  }
});

module.exports = router;
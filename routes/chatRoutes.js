const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/chat/conversations/:userId - Ambil semua ruang obrolan milik user
router.get('/conversations/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT * FROM conversations 
       WHERE id_user_a = ? OR id_user_b = ? 
       ORDER BY created_at DESC`,
      [userId, userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar obrolan', error: error.message });
  }
});

// POST /api/chat/conversations - Buat atau ambil ruang obrolan yang sudah ada
router.post('/conversations', async (req, res) => {
  const { id, id_user_a, id_user_b, id_item_terkait } = req.body;
  try {
    const [existing] = await db.query(
      `SELECT * FROM conversations 
       WHERE ((id_user_a = ? AND id_user_b = ?) OR (id_user_a = ? AND id_user_b = ?))
       AND (id_item_terkait = ? OR id_item_terkait IS NULL)
       LIMIT 1`,
      [id_user_a, id_user_b, id_user_b, id_user_a, id_item_terkait || null]
    );

    if (existing.length > 0) {
      return res.json({ success: true, data: existing[0] });
    }

    const convId = id || `CONV-${Date.now().toString().slice(-6)}`;
    await db.query(
      `INSERT INTO conversations (id, id_user_a, id_user_b, id_item_terkait)
       VALUES (?, ?, ?, ?)`,
      [convId, id_user_a, id_user_b, id_item_terkait || null]
    );

    res.status(201).json({
      success: true,
      data: { id: convId, id_user_a, id_user_b, id_item_terkait: id_item_terkait || null }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal membuat ruang obrolan', error: error.message });
  }
});

// GET /api/chat/messages/:conversationId - Ambil isi pesan dari ruang obrolan
router.get('/messages/:conversationId', async (req, res) => {
  const { conversationId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM messages WHERE id_conversation = ? ORDER BY created_at ASC',
      [conversationId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil pesan', error: error.message });
  }
});

// POST /api/chat/messages - Kirim pesan baru
router.post('/messages', async (req, res) => {
  const { id, id_conversation, id_pengirim, teks, waktu, type } = req.body;
  try {
    const msgId = id || `MSG-${Date.now().toString().slice(-6)}`;
    await db.query(
      `INSERT INTO messages (id, id_conversation, id_pengirim, teks, waktu, status_baca, type)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [msgId, id_conversation, id_pengirim, teks, waktu || 'Baru saja', type || 'text']
    );
    res.status(201).json({ success: true, message: 'Pesan berhasil dikirim!', msgId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengirim pesan', error: error.message });
  }
});

// PUT /api/chat/conversations/:id/read - Tandai pesan sudah dibaca
router.put('/conversations/:id/read', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  try {
    await db.query(
      `UPDATE messages 
       SET status_baca = 1 
       WHERE id_conversation = ? AND id_pengirim != ?`,
      [id, userId]
    );
    res.json({ success: true, message: 'Pesan ditandai sudah dibaca' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui status baca', error: error.message });
  }
});

module.exports = router;
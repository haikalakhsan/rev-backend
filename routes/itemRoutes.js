const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/items - Ambil semua barang
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM items ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data barang', error: error.message });
  }
});

// POST /api/items - Tambah barang baru
router.post('/', async (req, res) => {
  const { id, id_pemilik, nama_barang, nama, deskripsi, harga, kategori, kondisi, lokasi, foto, status } = req.body;
  try {
    const itemId = id || `ITM-${Date.now().toString().slice(-6)}`;
    const itemName = nama_barang || nama || 'Barang Tanpa Nama';
    const itemStatus = status || 'tersedia';
    const itemLokasi = lokasi || 'Kampus UNNES';

    await db.query(
      `INSERT INTO items (id, id_pemilik, nama_barang, deskripsi, harga, kategori, kondisi, lokasi, foto, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, id_pemilik, itemName, deskripsi || '', harga || 0, kategori || 'Lainnya', kondisi || 'Bekas', itemLokasi, foto || '', itemStatus]
    );

    res.status(201).json({ success: true, message: 'Barang berhasil ditambahkan!', itemId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan barang', error: error.message });
  }
});

// PUT /api/items/:id - Update data/status barang
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nama_barang, deskripsi, harga, kategori, kondisi, lokasi, foto, status } = req.body;
  try {
    await db.query(
      `UPDATE items
       SET nama_barang = COALESCE(?, nama_barang),
           deskripsi = COALESCE(?, deskripsi),
           harga = COALESCE(?, harga),
           kategori = COALESCE(?, kategori),
           kondisi = COALESCE(?, kondisi),
           lokasi = COALESCE(?, lokasi),
           foto = COALESCE(?, foto),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [nama_barang, deskripsi, harga, kategori, kondisi, lokasi, foto, status, id]
    );
    res.json({ success: true, message: 'Barang berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui barang', error: error.message });
  }
});

// DELETE /api/items/:id - Hapus barang
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM items WHERE id = ?', [id]);
    res.json({ success: true, message: 'Barang berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus barang', error: error.message });
  }
});

module.exports = router;
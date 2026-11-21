const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool, initTables } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '15mb' }));

// Health check untuk Railway
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Ambil seluruh state database untuk sinkronisasi frontend
app.get('/api/db', async (_req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM users');
    const [items] = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
    const [offers] = await pool.query('SELECT * FROM offers');
    const [conversations] = await pool.query('SELECT * FROM conversations');
    const [messages] = await pool.query('SELECT * FROM messages');
    const [cart] = await pool.query('SELECT * FROM cart');
    const [orders] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');

    res.json({
      users,
      items,
      offers,
      conversations,
      messages,
      cart,
      orders: orders.map((o) => ({
        id: o.id,
        userId: o.user_id,
        sellerId: o.seller_id,
        sellerName: o.seller_name,
        itemTitle: o.item_title,
        itemImage: o.item_image,
        type: o.type,
        price: Number(o.price || 0),
        barterOfferTitle: o.barter_offer_title,
        codLocation: o.cod_location,
        status: o.status,
        createdAt: o.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Sinkronisasi perubahan dari saveDB() frontend ke MySQL tanpa menimpa data user lain
app.post('/api/db/sync', async (req, res) => {
  const { db, deletedItemIds = [], currentUserId = '' } = req.body || {};
  if (!db) return res.status(400).json({ message: 'Payload db kosong' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Users
    for (const u of db.users || []) {
      await conn.query(
        `INSERT INTO users (id, nama, email, password, foto_profil, lokasi, rating, role, no_hp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         nama=VALUES(nama), password=VALUES(password), foto_profil=VALUES(foto_profil),
         lokasi=VALUES(lokasi), rating=VALUES(rating), role=VALUES(role), no_hp=VALUES(no_hp)`,
        [
          String(u.id),
          u.nama || u.name || 'User',
          String(u.email).toLowerCase(),
          u.password || 'milikkita',
          u.foto_profil || '/assets/seed-images/avatar-placeholder.svg',
          u.lokasi || 'Sekaran, Gunungpati',
          Number(u.rating ?? 5.0),
          u.role || 'user',
          u.no_hp || u.phone || '',
        ]
      );
    }

    // 2. Hapus item yang dihapus user
    for (const delId of deletedItemIds) {
      await conn.query('DELETE FROM items WHERE id = ?', [String(delId)]);
    }

    // 3. Upsert items
    for (const it of db.items || []) {
      await conn.query(
        `INSERT INTO items (id, nama, kategori, harga, kondisi, foto, status, id_pemilik, lokasi, deskripsi)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         nama=VALUES(nama), kategori=VALUES(kategori), harga=VALUES(harga), kondisi=VALUES(kondisi),
         foto=VALUES(foto), status=VALUES(status), lokasi=VALUES(lokasi), deskripsi=VALUES(deskripsi)`,
        [
          String(it.id),
          it.nama || it.title || 'Barang Mahasiswa',
          it.kategori || it.category || 'Perlengkapan Kos',
          Number(it.harga ?? it.price ?? 0),
          it.kondisi || it.condition || 'Bekas - Sangat Baik',
          it.foto || it.image || '/assets/seed-images/placeholder.svg',
          it.status || 'keduanya',
          String(it.id_pemilik ?? it.id_user ?? ''),
          it.lokasi || it.location || 'Sekaran, Gunungpati',
          it.deskripsi || it.description || '',
        ]
      );
    }

    // 4. Offers
    for (const ofr of db.offers || []) {
      await conn.query(
        `INSERT INTO offers (id, item_ditawarkan, item_diminta, status, id_pengirim, id_penerima, selisih_harga)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), selisih_harga=VALUES(selisih_harga)`,
        [
          String(ofr.id),
          String(ofr.item_ditawarkan),
          String(ofr.item_diminta),
          ofr.status || 'pending',
          String(ofr.id_pengirim),
          String(ofr.id_penerima),
          Number(ofr.selisih_harga || 0),
        ]
      );
    }

    // 5. Conversations
    for (const c of db.conversations || []) {
      await conn.query(
        `INSERT INTO conversations (id, id_user_a, id_user_b, id_item_terkait, deal_confirmed)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id_item_terkait=VALUES(id_item_terkait), deal_confirmed=VALUES(deal_confirmed)`,
        [
          String(c.id),
          String(c.id_user_a ?? c.buyerId ?? ''),
          String(c.id_user_b ?? c.sellerId ?? ''),
          String(c.id_item_terkait ?? c.itemId ?? ''),
          c.dealConfirmed ? 1 : 0,
        ]
      );
    }

    // 6. Messages
    for (const m of db.messages || []) {
      await conn.query(
        `INSERT INTO messages (id, id_conversation, id_pengirim, teks, waktu, status_baca, type)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE teks=VALUES(teks), status_baca=VALUES(status_baca)`,
        [
          String(m.id),
          String(m.id_conversation ?? m.conversationId ?? ''),
          String(m.id_pengirim ?? m.senderId ?? ''),
          m.teks || m.text || '',
          m.waktu || '',
          m.status_baca ? 1 : 0,
          m.type || 'text',
        ]
      );
    }

    // 7. Cart (hanya sinkronisasi keranjang milik akun yang sedang aktif)
    if (currentUserId) {
      await conn.query('DELETE FROM cart WHERE id_user = ?', [String(currentUserId)]);
      const userCart = (db.cart || []).filter(
        (c) => String(c.id_user ?? c.userId) === String(currentUserId)
      );
      for (const c of userCart) {
        await conn.query(
          `INSERT INTO cart (id, id_user, id_item, ditambahkan_pada, quantity)
           VALUES (?, ?, ?, ?, ?)`,
          [
            String(c.id || `CRT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
            String(currentUserId),
            String(c.id_item ?? c.itemId),
            c.ditambahkan_pada || new Date().toISOString(),
            Number(c.quantity || 1),
          ]
        );
      }
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

// Sinkronisasi transaksi OrdersPage
app.post('/api/orders/sync', async (req, res) => {
  const { orders = [] } = req.body || {};
  try {
    for (const o of orders) {
      await pool.query(
        `INSERT INTO orders (id, user_id, seller_id, seller_name, item_title, item_image, type, price, barter_offer_title, cod_location, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [
          String(o.id),
          String(o.userId),
          String(o.sellerId || ''),
          o.sellerName || '',
          o.itemTitle || '',
          o.itemImage || '',
          o.type || 'beli',
          Number(o.price || 0),
          o.barterOfferTitle || '',
          o.codLocation || '',
          o.status || 'Menunggu COD',
          o.createdAt || new Date().toISOString(),
        ]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

initTables()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 RE:V Backend berjalan di port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Gagal inisialisasi database:', err);
    process.exit(1);
  });
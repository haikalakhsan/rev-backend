const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
  port: Number(process.env.MYSQLPORT || process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        foto_profil LONGTEXT,
        lokasi VARCHAR(100) DEFAULT 'Kampus UNNES',
        phone VARCHAR(30) DEFAULT '',
        rating DECIMAL(3, 1) DEFAULT 5.0,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(50) PRIMARY KEY,
        id_pemilik VARCHAR(50) NOT NULL,
        nama_barang VARCHAR(150) NOT NULL,
        deskripsi TEXT,
        harga INT NOT NULL DEFAULT 0,
        kategori VARCHAR(50) NOT NULL,
        kondisi VARCHAR(50) NOT NULL,
        lokasi VARCHAR(100) DEFAULT 'Kampus UNNES',
        foto LONGTEXT,
        status VARCHAR(30) DEFAULT 'tersedia',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_pemilik) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id VARCHAR(50) PRIMARY KEY,
        item_ditawarkan VARCHAR(50) NOT NULL,
        item_diminta VARCHAR(50) NOT NULL,
        status VARCHAR(30) DEFAULT 'pending',
        id_pengirim VARCHAR(50) NOT NULL,
        id_penerima VARCHAR(50) NOT NULL,
        selisih_harga INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_ditawarkan) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (item_diminta) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (id_pengirim) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (id_penerima) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(50) PRIMARY KEY,
        id_user_a VARCHAR(50) NOT NULL,
        id_user_b VARCHAR(50) NOT NULL,
        id_item_terkait VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_user_a) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (id_user_b) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (id_item_terkait) REFERENCES items(id) ON DELETE SET NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(50) PRIMARY KEY,
        id_conversation VARCHAR(50) NOT NULL,
        id_pengirim VARCHAR(50) NOT NULL,
        teks TEXT NOT NULL,
        waktu VARCHAR(50) NOT NULL,
        status_baca TINYINT(1) DEFAULT 0,
        type VARCHAR(30) DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_conversation) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (id_pengirim) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        id_user VARCHAR(50) NOT NULL,
        tipe VARCHAR(50) NOT NULL,
        teks TEXT NOT NULL,
        waktu VARCHAR(50) NOT NULL,
        sudah_dibaca TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    await pool.query(
      `INSERT IGNORE INTO users (id, nama, email, password, foto_profil, lokasi, rating, role)
       VALUES ('USR-000', 'Admin RE:V', 'admin@techno.ac.id', ?, '/assets/seed-images/avatar-placeholder.svg', 'Kampus UNNES Gunungpati', 5.0, 'admin')`,
      [adminPassword]
    );

    console.log('Seluruh 6 Tabel MySQL RE:V & Akun Admin berhasil diinisialisasi!');
  } catch (error) {
    console.error('Gagal inisialisasi tabel MySQL:', error.message);
  }
}

initTables();

module.exports = pool;
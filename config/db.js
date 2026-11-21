const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = process.env.MYSQL_URL
  ? mysql.createPool(process.env.MYSQL_URL)
  : mysql.createPool({
      host: process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
      user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'rev_db',
      waitForConnections: true,
      connectionLimit: 10,
    });

async function initTables() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        foto_profil LONGTEXT,
        lokasi VARCHAR(255) DEFAULT 'Sekaran, Gunungpati',
        rating DOUBLE DEFAULT 5.0,
        role VARCHAR(30) DEFAULT 'user',
        no_hp VARCHAR(50) DEFAULT ''
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(64) PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        kategori VARCHAR(100) DEFAULT 'Perlengkapan Kos',
        harga BIGINT DEFAULT 0,
        kondisi VARCHAR(100) DEFAULT 'Bekas - Sangat Baik',
        foto LONGTEXT,
        status VARCHAR(50) DEFAULT 'keduanya',
        id_pemilik VARCHAR(64) NOT NULL,
        lokasi VARCHAR(255) DEFAULT 'Sekaran, Gunungpati',
        deskripsi TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id VARCHAR(64) PRIMARY KEY,
        item_ditawarkan VARCHAR(64) NOT NULL,
        item_diminta VARCHAR(64) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        id_pengirim VARCHAR(64) NOT NULL,
        id_penerima VARCHAR(64) NOT NULL,
        selisih_harga BIGINT DEFAULT 0
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(64) PRIMARY KEY,
        id_user_a VARCHAR(64) NOT NULL,
        id_user_b VARCHAR(64) NOT NULL,
        id_item_terkait VARCHAR(64) DEFAULT '',
        deal_confirmed TINYINT(1) DEFAULT 0
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(64) PRIMARY KEY,
        id_conversation VARCHAR(64) NOT NULL,
        id_pengirim VARCHAR(64) NOT NULL,
        teks TEXT NOT NULL,
        waktu VARCHAR(64) DEFAULT '',
        status_baca TINYINT(1) DEFAULT 0,
        type VARCHAR(30) DEFAULT 'text'
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id VARCHAR(64) PRIMARY KEY,
        id_user VARCHAR(64) NOT NULL,
        id_item VARCHAR(64) NOT NULL,
        ditambahkan_pada VARCHAR(64) DEFAULT '',
        quantity INT DEFAULT 1
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        seller_id VARCHAR(64) DEFAULT '',
        seller_name VARCHAR(150) DEFAULT '',
        item_title VARCHAR(255) NOT NULL,
        item_image LONGTEXT,
        type VARCHAR(30) DEFAULT 'beli',
        price BIGINT DEFAULT 0,
        barter_offer_title VARCHAR(255) DEFAULT '',
        cod_location VARCHAR(255) DEFAULT '',
        status VARCHAR(50) DEFAULT 'Menunggu COD',
        created_at VARCHAR(64) DEFAULT ''
      )
    `);

    console.log('✅ Tabel MySQL RE:V siap digunakan');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initTables };
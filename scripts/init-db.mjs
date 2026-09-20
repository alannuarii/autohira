import pg from "pg";
import dotenv from "dotenv";

// Muat environment variables dari .env bila ada
dotenv.config();

const { Client } = pg;

const host = process.env.DB_HOST || "localhost";
const port = Number(process.env.DB_PORT) || 5432;
const user = process.env.DB_USER || "postgres";
const password = process.env.DB_PASSWORD || "";
const targetDb = process.env.DB_NAME || "db_autohira";
const adminDb = process.env.DB_ADMIN_DATABASE || "postgres";

async function checkAndCreateDatabase() {
  console.log(`[AutoHIRA] Memeriksa status database "${targetDb}" pada ${host}:${port}...`);

  const client = new Client({
    host,
    port,
    user,
    password,
    database: adminDb,
  });

  try {
    await client.connect();

    const checkQuery = "SELECT 1 FROM pg_database WHERE datname = $1";
    const result = await client.query(checkQuery, [targetDb]);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`[AutoHIRA] Database "${targetDb}" SUDAH ADA. Melewati proses pembuatan database.`);
    } else {
      console.log(`[AutoHIRA] Database "${targetDb}" BELUM DITEMUKAN. Membuat database baru...`);

      // Validasi nama database agar aman dari injeksi
      if (!/^[a-zA-Z0-9_]+$/.test(targetDb)) {
        throw new Error(`Nama database "${targetDb}" tidak valid (hanya boleh alphanumeric & underscore).`);
      }

      await client.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`[AutoHIRA] Database "${targetDb}" BERHASIL DIBUAT.`);
    }
  } catch (error) {
    console.error(`[AutoHIRA ERROR] Gagal memeriksa atau membuat database:`, error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

checkAndCreateDatabase();

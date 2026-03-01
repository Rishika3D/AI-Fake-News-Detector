import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

// Render / Neon / Railway all provide DATABASE_URL.
// Locally we fall back to individual PG* env vars from .env.
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required by Neon & Render managed DBs
    }
  : {
      user:     process.env.DB_USER,
      host:     process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port:     Number(process.env.DB_PORT) || 5432,
    };

const db = new pg.Pool({
  ...poolConfig,
  max:                     10,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

db.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

export default db;

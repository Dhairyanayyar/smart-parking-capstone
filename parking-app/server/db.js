
const path = require("path");
const dotenv = require("dotenv");
const { Pool } = require("pg");

// Load .env from the parking-app folder.
dotenv.config({
  path: path.join(__dirname, "../.env"),
  quiet: true
});

// Use Render's DATABASE_URL when available.
// Otherwise, use local PostgreSQL settings.
const pool = new Pool({
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {}),
  connectionTimeoutMillis: 5000
});

// Handle unexpected database connection errors.
pool.on("error", (error) => {
  console.error("Database connection error:", error.message);
});

module.exports = pool;

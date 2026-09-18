const path = require("path");
const dotenv = require("dotenv");
const { Pool } = require("pg");

// Load .env from the parking-app folder.
dotenv.config({
  path: path.join(__dirname, "../.env")
});

// Pool reads the PG settings from the environment.
const pool = new Pool({
  connectionTimeoutMillis: 5000
});

pool.on("error", (error) => {
  console.error("Database connection error:", error.message);
});

module.exports = pool;

const path = require("path");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const pool = require("./db");

require("dotenv").config({
  path: path.join(__dirname, "../.env"),
  quiet: true
});

const isProduction = process.env.NODE_ENV === "production";

const secret = process.env.NODE_ENV === "test"
  ? "test-only-session-secret-never-use-for-deployment"
  : process.env.SESSION_SECRET;

if (!secret || secret.length < 32) {
  throw new Error(
    "Add a SESSION_SECRET of at least 32 characters to .env."
  );
}

// Use PostgreSQL to store persistent login sessions.
// Keep tests independent of the real database.
const PgSession = connectPgSimple(session);

const sessionOptions = {
  name: "smartparking.sid",
  secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 15 * 60 * 1000
  }
};

if (process.env.NODE_ENV !== "test") {
  sessionOptions.store = new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15
  });
}

module.exports = session(sessionOptions);

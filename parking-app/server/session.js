const path = require("path");
const session = require("express-session");

require("dotenv").config({
  path: path.join(__dirname, "../.env"),
  quiet: true
});

const secret = process.env.NODE_ENV === "test"
  ? "test-only-session-secret-never-use-for-deployment"
  : process.env.SESSION_SECRET;

if (!secret || secret.length < 32) {
  throw new Error("Add a SESSION_SECRET of at least 32 characters to .env.");
}

module.exports = session({
  name: "smartparking.sid",
  secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60 * 1000
  }
});
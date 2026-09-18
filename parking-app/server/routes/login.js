const express = require("express");
const argon2 = require("argon2");
const pool = require("../db");

const router = express.Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post("/login", async (req, res, next) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    !email.trim() ||
    email.trim().length > 254 ||
    typeof password !== "string" ||
    !password
  ) {
    return res.status(400).json({
      message: "Email and password are required."
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, password_hash, role
       FROM users WHERE LOWER(email) = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user || !(await argon2.verify(user.password_hash, password))) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    req.session.regenerate((error) => {
      if (error) return next(error);

      req.session.userId = user.id;

      req.session.save((error) => {
        if (error) return next(error);

        const { password_hash, ...safeUser } = user;

        return res.json({
          message: "Logged in successfully.",
          user: safeUser
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Please log in." });
  }

  try {
    const result = await pool.query(
      "SELECT id, first_name, last_name, email, role FROM users WHERE id = $1",
      [req.session.userId]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ message: "Please log in." });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("smartparking.sid", { path: "/" });

    return res.json({
      message: "Logged out successfully."
    });
  });
});

module.exports = router;
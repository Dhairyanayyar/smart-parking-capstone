const express = require("express");
const argon2 = require("argon2");
const pool = require("../db");
const { validateRegistration } = require("../validation/registration");

const router = express.Router();

router.post("/register", async (req, res) => {
  const errors = validateRegistration(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const { firstName, lastName, email, password } = req.body;

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id
    });

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, first_name, last_name, email, role, created_at`,
      [
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        "user"
      ]
    );

    return res.status(201).json({
      message: "Account created successfully.",
      user: result.rows[0]
    });
  } catch (error) {
    if (
      error.code === "23505" &&
      error.constraint === "users_email_unique"
    ) {
      return res.status(409).json({
        message: "Email is already registered."
      });
    }

    console.error("Registration failed:", error.code || error.name);

    return res.status(500).json({
      message: "Unable to create account. Please try again."
    });
  }
});

module.exports = router;
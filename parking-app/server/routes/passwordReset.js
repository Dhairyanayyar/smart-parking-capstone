const express = require("express");
const crypto = require("crypto");
const argon2 = require("argon2");

const router = express.Router();

module.exports = (pool) => {
  router.post("/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({
          message: "Email is required."
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const userResult = await pool.query(
        `
        SELECT id, email
        FROM users
        WHERE LOWER(email) = $1
        `,
        [normalizedEmail]
      );

      if (userResult.rows.length === 0) {
        return res.status(200).json({
          message:
            "If an account exists for that email, a password reset link has been created."
        });
      }

      const user = userResult.rows[0];

      await pool.query(
        `
        UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND used_at IS NULL
        `,
        [user.id]
      );

      const token = crypto.randomBytes(32).toString("hex");

      const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await pool.query(
        `
        INSERT INTO password_reset_tokens
            (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        `,
        [user.id, tokenHash, expiresAt]
      );

      return res.status(200).json({
        message:
          "If an account exists for that email, a password reset link has been created.",
        resetToken: token
      });
    } catch (error) {
      console.error("Forgot password error:", error);

      return res.status(500).json({
        message: "Unable to process password reset request."
      });
    }
  });

  router.post("/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || typeof token !== "string") {
        return res.status(400).json({
          message: "Reset token is required."
        });
      }

      if (
        !password ||
        typeof password !== "string" ||
        password.length < 8
      ) {
        return res.status(400).json({
          message: "Password must be at least 8 characters."
        });
      }

      const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const tokenResult = await pool.query(
        `
        SELECT id, user_id, expires_at, used_at
        FROM password_reset_tokens
        WHERE token_hash = $1
        `,
        [tokenHash]
      );

      if (tokenResult.rows.length === 0) {
        return res.status(400).json({
          message: "Invalid or expired reset token."
        });
      }

      const resetToken = tokenResult.rows[0];

      if (
        resetToken.used_at ||
        new Date(resetToken.expires_at) < new Date()
      ) {
        return res.status(400).json({
          message: "Invalid or expired reset token."
        });
      }

      const passwordHash = await argon2.hash(password);

      await pool.query("BEGIN");

      try {
        await pool.query(
          `
          UPDATE users
          SET password_hash = $1
          WHERE id = $2
          `,
          [passwordHash, resetToken.user_id]
        );

        await pool.query(
          `
          UPDATE password_reset_tokens
          SET used_at = CURRENT_TIMESTAMP
          WHERE id = $1
          `,
          [resetToken.id]
        );

        await pool.query("COMMIT");
      } catch (transactionError) {
        await pool.query("ROLLBACK");
        throw transactionError;
      }

      return res.status(200).json({
        message: "Password reset successfully."
      });
    } catch (error) {
      console.error("Reset password error:", error);

      return res.status(500).json({
        message: "Unable to reset password."
      });
    }
  });

  return router;
};
const express = require("express");
const argon2 = require("argon2");

module.exports = (pool) => {
  const router = express.Router();

  function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        message: "Please log in."
      });
    }

    next();
  }

  // GET /api/profile
  router.get("/profile", requireLogin, async (req, res) => {
    try {
      const userId = req.session.userId;

      const result = await pool.query(
        `
        SELECT
          id,
          first_name,
          last_name,
          email,
          role,
          created_at
        FROM users
        WHERE id = $1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "User not found."
        });
      }

      return res.status(200).json({
        user: result.rows[0]
      });
    } catch (error) {
      console.error("Profile error:", error);

      return res.status(500).json({
        message: "Unable to load profile."
      });
    }
  });

  // PUT /api/profile
  router.put("/profile", requireLogin, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { firstName, lastName } = req.body;

      if (
        typeof firstName !== "string" ||
        !firstName.trim() ||
        firstName.trim().length > 100
      ) {
        return res.status(400).json({
          message:
            "First name is required and must be at most 100 characters."
        });
      }

      if (
        typeof lastName !== "string" ||
        !lastName.trim() ||
        lastName.trim().length > 100
      ) {
        return res.status(400).json({
          message:
            "Last name is required and must be at most 100 characters."
        });
      }

      const result = await pool.query(
        `
        UPDATE users
        SET
          first_name = $1,
          last_name = $2
        WHERE id = $3
        RETURNING
          id,
          first_name,
          last_name,
          email,
          role,
          created_at
        `,
        [
          firstName.trim(),
          lastName.trim(),
          userId
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "User not found."
        });
      }

      return res.status(200).json({
        message: "Profile updated successfully.",
        user: result.rows[0]
      });
    } catch (error) {
      console.error("Profile update error:", error);

      return res.status(500).json({
        message: "Unable to update profile."
      });
    }
  });

  // PUT /api/profile/password
  router.put(
    "/profile/password",
    requireLogin,
    async (req, res) => {
      try {
        const userId = req.session.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
          return res.status(400).json({
            message:
              "Current password and new password are required."
          });
        }

        const strongPassword =
          typeof newPassword === "string" &&
          newPassword.length >= 8 &&
          /[a-z]/.test(newPassword) &&
          /[A-Z]/.test(newPassword) &&
          /\d/.test(newPassword) &&
          /[^A-Za-z0-9]/.test(newPassword);

        if (!strongPassword) {
          return res.status(400).json({
            message:
              "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."
          });
        }

        const userResult = await pool.query(
          `
          SELECT id, password_hash
          FROM users
          WHERE id = $1
          `,
          [userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({
            message: "User not found."
          });
        }

        const passwordMatches = await argon2.verify(
          userResult.rows[0].password_hash,
          currentPassword
        );

        if (!passwordMatches) {
          return res.status(400).json({
            message: "Current password is incorrect."
          });
        }

        const newPasswordHash = await argon2.hash(
          newPassword
        );

        await pool.query(
          `
          UPDATE users
          SET password_hash = $1
          WHERE id = $2
          `,
          [newPasswordHash, userId]
        );

        return res.status(200).json({
          message: "Password updated successfully."
        });
      } catch (error) {
        console.error("Password update error:", error);

        return res.status(500).json({
          message: "Unable to update password."
        });
      }
    }
  );

  return router;
};
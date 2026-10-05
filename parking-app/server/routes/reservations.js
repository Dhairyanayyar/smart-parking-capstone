const express = require("express");

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

  router.get("/reservations", requireLogin, async (req, res) => {
    try {
      const userId = req.session.userId;

      const result = await pool.query(
        `
        SELECT
          id,
          location,
          reservation_date,
          start_time,
          end_time,
          status,
          created_at
        FROM reservations
        WHERE user_id = $1
        ORDER BY reservation_date DESC, start_time DESC
        `,
        [userId]
      );

      return res.status(200).json({
        reservations: result.rows
      });
    } catch (error) {
      console.error("Reservation history error:", error);

      return res.status(500).json({
        message: "Unable to load reservation history."
      });
    }
  });

  return router;
};

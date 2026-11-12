
const express = require("express");

function createParkingSearchRouter(pool) {
  const router = express.Router();

  router.get("/search", async (req, res) => {
    try {
      const location =
        typeof req.query.location === "string"
          ? req.query.location.trim()
          : "";

      const date =
        typeof req.query.date === "string"
          ? req.query.date.trim()
          : "";

      if (
        (req.query.location !== undefined &&
          typeof req.query.location !== "string") ||
        (req.query.date !== undefined &&
          typeof req.query.date !== "string")
      ) {
        return res.status(400).json({
          error: "Invalid search parameters"
        });
      }

      if (date) {
        const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(date);

        const parsed = new Date(`${date}T00:00:00Z`);

        const validDate =
          validFormat &&
          !Number.isNaN(parsed.getTime()) &&
          parsed.toISOString().slice(0, 10) === date;

        if (!validDate) {
          return res.status(400).json({
            error: "Date must be a valid YYYY-MM-DD date"
          });
        }
      }

      const conditions = ["is_available = TRUE"];
      const values = [];

      if (location) {
        values.push(`%${location}%`);

        conditions.push(
          `location ILIKE $${values.length}`
        );
      }

      if (date) {
        values.push(date);

        conditions.push(
          `available_date = $${values.length}::date`
        );
      }

      const query = `
        SELECT
          id,
          location,
          address,
          is_available,
          available_date,
          available_from,
          available_until
        FROM parking_spaces
        WHERE ${conditions.join(" AND ")}
        ORDER BY location ASC, id ASC
      `;

      const result = await pool.query(query, values);

      return res.status(200).json({
        success: true,
        count: result.rows.length,
        parkingSpaces: result.rows
      });
    } catch (error) {
      console.error("Parking search error:", error);

      return res.status(500).json({
        error: "Unable to search parking spaces"
      });
    }
  });

  return router;
}

module.exports = createParkingSearchRouter;

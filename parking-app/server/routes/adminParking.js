
const express = require("express");
const requireAdmin = require("../middleware/requireAdmin");

/**
 * Creates routes for managing parking spaces.
 */
module.exports = (pool) => {
  const router = express.Router();

  // Require administrator access for all routes.
  router.use(requireAdmin(pool));

  /**
   * Gets all parking spaces.
   */
  router.get("/admin/parking-spaces", async (req, res, next) => {
    try {
      const result = await pool.query(
        "SELECT * FROM parking_spaces ORDER BY id"
      );

      return res.json({ parkingSpaces: result.rows });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Adds a new parking space.
   */
  router.post("/admin/parking-spaces", async (req, res, next) => {
    const { location, spaceNumber, pricePerHour } = req.body || {};

    if (
      typeof location !== "string" ||
      !location.trim() ||
      location.trim().length > 255 ||
      typeof spaceNumber !== "string" ||
      !spaceNumber.trim() ||
      spaceNumber.trim().length > 50 ||
      typeof pricePerHour !== "number" ||
      !Number.isFinite(pricePerHour) ||
      pricePerHour < 0
    ) {
      return res.status(400).json({
        message: "Valid parking space details are required."
      });
    }

    try {
      const result = await pool.query(
        `INSERT INTO parking_spaces
         (location, space_number, price_per_hour)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [location.trim(), spaceNumber.trim(), pricePerHour]
      );

      return res.status(201).json({
        parkingSpace: result.rows[0]
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "Parking space already exists."
        });
      }

      next(error);
    }
  });

  /**
   * Updates an existing parking space.
   */
  router.put("/admin/parking-spaces/:id", async (req, res, next) => {
    const id = Number(req.params.id);
    const { location, spaceNumber, pricePerHour, isAvailable } =
      req.body || {};

    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      typeof location !== "string" ||
      !location.trim() ||
      location.trim().length > 255 ||
      typeof spaceNumber !== "string" ||
      !spaceNumber.trim() ||
      spaceNumber.trim().length > 50 ||
      typeof pricePerHour !== "number" ||
      !Number.isFinite(pricePerHour) ||
      pricePerHour < 0 ||
      typeof isAvailable !== "boolean"
    ) {
      return res.status(400).json({
        message: "Valid parking space details are required."
      });
    }

    try {
      const result = await pool.query(
        `UPDATE parking_spaces
         SET location = $1,
             space_number = $2,
             price_per_hour = $3,
             is_available = $4
         WHERE id = $5
         RETURNING *`,
        [
          location.trim(),
          spaceNumber.trim(),
          pricePerHour,
          isAvailable,
          id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Parking space not found."
        });
      }

      return res.json({ parkingSpace: result.rows[0] });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "Parking space already exists."
        });
      }

      next(error);
    }
  });

  /**
   * Deletes a parking space.
   */
  router.delete("/admin/parking-spaces/:id", async (req, res, next) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid parking space ID."
      });
    }

    try {
      const result = await pool.query(
        "DELETE FROM parking_spaces WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Parking space not found."
        });
      }

      return res.json({
        message: "Parking space deleted successfully."
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

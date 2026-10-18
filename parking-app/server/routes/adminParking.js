
const express = require("express");
const requireAdmin = require("../middleware/requireAdmin");

/**
 * Validates parking space information.
 */
function validateParkingSpace(body) {
  const {
    location,
    address,
    spaceNumber,
    pricePerHour,
    availableDate,
    availableFrom,
    availableUntil
  } = body || {};

  if (
    typeof location !== "string" ||
    !location.trim() ||
    location.trim().length > 255 ||
    typeof address !== "string" ||
    !address.trim() ||
    address.trim().length > 255 ||
    typeof spaceNumber !== "string" ||
    !spaceNumber.trim() ||
    spaceNumber.trim().length > 50 ||
    typeof pricePerHour !== "number" ||
    !Number.isFinite(pricePerHour) ||
    pricePerHour < 0 ||
    pricePerHour > 99999999.99
  ) {
    return false;
  }

  // Check date format and ensure it is a valid date.
  if (
    typeof availableDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(availableDate)
  ) {
    return false;
  }

  const date = new Date(`${availableDate}T00:00:00Z`);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== availableDate
  ) {
    return false;
  }

  // Validate 24-hour time format.
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (
    typeof availableFrom !== "string" ||
    typeof availableUntil !== "string" ||
    !timePattern.test(availableFrom) ||
    !timePattern.test(availableUntil) ||
    availableUntil <= availableFrom
  ) {
    return false;
  }

  return true;
}

/**
 * Creates administrator parking management routes.
 */
module.exports = (pool) => {
  const router = express.Router();

  // Protect every admin route.
  router.use(requireAdmin(pool));

  /**
   * Retrieves all parking spaces.
   */
  router.get("/admin/parking-spaces", async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT *
         FROM parking_spaces
         ORDER BY id`
      );

      return res.status(200).json({
        parkingSpaces: result.rows
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Creates a new parking space.
   */
  router.post("/admin/parking-spaces", async (req, res, next) => {
    const body = req.body || {};

    if (!validateParkingSpace(body)) {
      return res.status(400).json({
        message: "Valid parking space details are required."
      });
    }

    const {
      location,
      address,
      spaceNumber,
      pricePerHour,
      availableDate,
      availableFrom,
      availableUntil
    } = body;

    try {
      const result = await pool.query(
        `INSERT INTO parking_spaces
         (
           location,
           address,
           space_number,
           price_per_hour,
           available_date,
           available_from,
           available_until
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          location.trim(),
          address.trim(),
          spaceNumber.trim(),
          pricePerHour,
          availableDate,
          availableFrom,
          availableUntil
        ]
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
    const body = req.body || {};

    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      id > 2147483647 ||
      !validateParkingSpace(body) ||
      typeof body.isAvailable !== "boolean"
    ) {
      return res.status(400).json({
        message: "Valid parking space details are required."
      });
    }

    const {
      location,
      address,
      spaceNumber,
      pricePerHour,
      availableDate,
      availableFrom,
      availableUntil,
      isAvailable
    } = body;

    try {
      const result = await pool.query(
        `UPDATE parking_spaces
         SET location = $1,
             address = $2,
             space_number = $3,
             price_per_hour = $4,
             available_date = $5,
             available_from = $6,
             available_until = $7,
             is_available = $8
         WHERE id = $9
         RETURNING *`,
        [
          location.trim(),
          address.trim(),
          spaceNumber.trim(),
          pricePerHour,
          availableDate,
          availableFrom,
          availableUntil,
          isAvailable,
          id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Parking space not found."
        });
      }

      return res.status(200).json({
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
   * Deletes an existing parking space.
   */
  router.delete("/admin/parking-spaces/:id", async (req, res, next) => {
    const id = Number(req.params.id);

    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      id > 2147483647
    ) {
      return res.status(400).json({
        message: "Invalid parking space ID."
      });
    }

    try {
      const result = await pool.query(
        `DELETE FROM parking_spaces
         WHERE id = $1
         RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Parking space not found."
        });
      }

      return res.status(200).json({
        message: "Parking space deleted successfully."
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

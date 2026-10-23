
const express = require("express");

module.exports = (pool) => {
  const router = express.Router();

  // Only logged-in users can make reservations.
  function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        message: "Please log in."
      });
    }

    next();
  }

  // GET available parking spaces for regular users.
  router.get("/parking-spaces", requireLogin, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          location,
          address,
          space_number,
          price_per_hour,
          available_date,
          available_from,
          available_until
        FROM parking_spaces
        WHERE is_available = TRUE
          AND available_date >= CURRENT_DATE
          AND available_from IS NOT NULL
          AND available_until IS NOT NULL
        ORDER BY available_date, location, space_number
      `);

      return res.status(200).json({
        parkingSpaces: result.rows
      });
    } catch (error) {
      console.error("Parking search error:", error.message);

      return res.status(500).json({
        message: "Unable to load parking spaces."
      });
    }
  });

  // POST: Create a parking reservation.
  router.post("/reservations", requireLogin, async (req, res) => {
    const {
      parkingSpaceId,
      reservationDate,
      startTime,
      endTime
    } = req.body || {};

    const validDate =
      typeof reservationDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(reservationDate) &&
      !Number.isNaN(Date.parse(reservationDate)) &&
      new Date(reservationDate).toISOString().slice(0, 10) === reservationDate;

    const validTime = (time) =>
      typeof time === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

    if (
      !Number.isSafeInteger(parkingSpaceId) ||
      parkingSpaceId <= 0 ||
      !validDate ||
      !validTime(startTime) ||
      !validTime(endTime) ||
      startTime >= endTime
    ) {
      return res.status(400).json({
        message: "Please provide a valid parking space, date and time."
      });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      // Lock the parking space while checking availability.
      const result = await client.query(
        `
        SELECT
          id,
          location,
          is_available,
          available_date::text AS available_date,
          available_from,
          available_until
        FROM parking_spaces
        WHERE id = $1
        FOR UPDATE
        `,
        [parkingSpaceId]
      );

      const space = result.rows[0];

      if (!space || !space.is_available) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: "Parking space is not available."
        });
      }

      const from = String(space.available_from || "").slice(0, 5);
      const until = String(space.available_until || "").slice(0, 5);

      if (
        space.available_date !== reservationDate ||
        reservationDate < new Date().toISOString().slice(0, 10) ||
        startTime < from ||
        endTime > until
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Booking is outside the available date or time."
        });
      }

      // Check for an overlapping reservation.
      const conflict = await client.query(
        `
        SELECT id
        FROM reservations
        WHERE parking_space_id = $1
          AND reservation_date = $2
          AND status = 'active'
          AND start_time < $4::time
          AND end_time > $3::time
        LIMIT 1
        `,
        [
          parkingSpaceId,
          reservationDate,
          startTime,
          endTime
        ]
      );

      if (conflict.rows.length > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "This space is already booked during that time."
        });
      }

      // Store the user's reservation.
      const booking = await client.query(
        `
        INSERT INTO reservations (
          user_id,
          parking_space_id,
          location,
          reservation_date,
          start_time,
          end_time,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING
          id,
          parking_space_id,
          location,
          reservation_date,
          start_time,
          end_time,
          status
        `,
        [
          req.session.userId,
          parkingSpaceId,
          space.location,
          reservationDate,
          startTime,
          endTime
        ]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Parking booked successfully.",
        reservation: booking.rows[0]
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Rollback failed:", rollbackError.message);
        }
      }

      console.error("Booking error:", error.message);

      return res.status(500).json({
        message: "Unable to create parking reservation."
      });
    } finally {
      if (client) client.release();
    }
  });

  // GET reservation history for the logged-in user.
  router.get("/reservations", requireLogin, async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          parking_space_id,
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
        [req.session.userId]
      );

      return res.status(200).json({
        reservations: result.rows
      });
    } catch (error) {
      console.error("Reservation history error:", error.message);

      return res.status(500).json({
        message: "Unable to load reservation history."
      });
    }
  });

  return router;
};

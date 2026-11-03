
const request = require("supertest");
const express = require("express");
const { Pool } = require("pg");
const reservationRoutes = require("./reservations");

// Run only when integration testing is explicitly enabled.
const describeIntegration =
  process.env.RUN_DB_INTEGRATION === "1"
    ? describe
    : describe.skip;

describeIntegration("Week 8 - Real PostgreSQL Concurrency", () => {
  let pool;
  let app;
  let userId;
  let parkingSpaceId;

  const reservationDate = "2099-10-30";
  const uniqueId = `${Date.now()}_${process.pid}`;

  beforeAll(async () => {
    // Use an isolated database, never the production database.
    pool = new Pool({
      database: "smart_parking_test",
      max: 5
    });

    const database = await pool.query(
      "SELECT current_database() AS name"
    );

    if (database.rows[0].name !== "smart_parking_test") {
      throw new Error("Unsafe database connection.");
    }

    // Create a test user.
    const userResult = await pool.query(
      `INSERT INTO users (
        first_name,
        last_name,
        email,
        password_hash,
        role
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [
        "Week8",
        "Test",
        `week8_${uniqueId}@example.com`,
        "integration-test-placeholder",
        "user"
      ]
    );

    userId = userResult.rows[0].id;

    // Create a test parking space.
    const spaceResult = await pool.query(
      `INSERT INTO parking_spaces (
        location,
        space_number,
        price_per_hour,
        is_available,
        available_date,
        available_from,
        available_until
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        "Week 8 Test Parking",
        `TEST-${uniqueId}`,
        5.00,
        true,
        reservationDate,
        "09:00",
        "17:00"
      ]
    );

    parkingSpaceId = spaceResult.rows[0].id;

    // Build the real API with the test database.
    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.session = { userId };
      next();
    });

    app.use("/api", reservationRoutes(pool));
  });

  afterAll(async () => {
    if (!pool) return;

    try {
      if (parkingSpaceId) {
        await pool.query(
          "DELETE FROM reservations WHERE parking_space_id = $1",
          [parkingSpaceId]
        );

        await pool.query(
          "DELETE FROM parking_spaces WHERE id = $1",
          [parkingSpaceId]
        );
      }

      if (userId) {
        await pool.query(
          "DELETE FROM users WHERE id = $1",
          [userId]
        );
      }
    } finally {
      await pool.end();
    }
  });

  test("only one simultaneous booking succeeds", async () => {
    const booking = {
      parkingSpaceId,
      reservationDate,
      startTime: "10:00",
      endTime: "11:00"
    };

    // Send both requests concurrently.
    const [responseA, responseB] = await Promise.all([
      request(app)
        .post("/api/reservations")
        .send(booking),

      request(app)
        .post("/api/reservations")
        .send(booking)
    ]);

    const statuses = [
      responseA.statusCode,
      responseB.statusCode
    ].sort((a, b) => a - b);

    expect(statuses).toEqual([201, 409]);

    // Verify only one active booking exists.
    const result = await pool.query(
      `SELECT COUNT(*)::integer AS count
       FROM reservations
       WHERE parking_space_id = $1
         AND reservation_date = $2
         AND status = 'active'`,
      [parkingSpaceId, reservationDate]
    );

    expect(result.rows[0].count).toBe(1);
  }, 20000);
});

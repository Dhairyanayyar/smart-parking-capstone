const request = require("supertest");
const express = require("express");
const reservationRoutes = require("./reservations");

describe("Reservation routes", () => {
  let app;
  let pool;

  beforeEach(() => {
    pool = {
      query: jest.fn()
    };

    app = express();
    app.use(express.json());

    app.use((req, res, next) => {
      req.session = {
        userId: 1
      };

      next();
    });

    app.use("/api", reservationRoutes(pool));
  });

  test("GET /reservations returns user's reservations", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          location: "Downtown Parking",
          reservation_date: "2026-10-10",
          start_time: "10:00:00",
          end_time: "12:00:00",
          status: "active"
        }
      ]
    });

    const response = await request(app)
      .get("/api/reservations");

    expect(response.statusCode).toBe(200);
    expect(response.body.reservations).toHaveLength(1);
    expect(response.body.reservations[0].location)
      .toBe("Downtown Parking");
  });

  test("GET /reservations returns empty array when there are no reservations", async () => {
    pool.query.mockResolvedValueOnce({
      rows: []
    });

    const response = await request(app)
      .get("/api/reservations");

    expect(response.statusCode).toBe(200);
    expect(response.body.reservations).toEqual([]);
  });

  test("GET /reservations handles database error", async () => {
    pool.query.mockRejectedValueOnce(
      new Error("Database error")
    );

    const response = await request(app)
      .get("/api/reservations");

    expect(response.statusCode).toBe(500);
    expect(response.body.message)
      .toBe("Unable to load reservation history.");
  });
});

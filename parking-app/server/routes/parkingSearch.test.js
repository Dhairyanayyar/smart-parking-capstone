const express = require("express");
const request = require("supertest");
const createParkingSearchRouter = require("./parkingSearch");

describe("Week 9 Parking Search", () => {
  let app;
  let pool;

  beforeEach(() => {
    pool = {
      query: jest.fn().mockResolvedValue({
        rows: [{
          id: 3,
          location: "Hamilton Downtown",
          address: "23 Main Street, Hamilton",
          is_available: true,
          available_date: "2099-10-30",
          available_from: "09:00:00",
          available_until: "17:00:00"
        }]
      })
    };

    app = express();
    app.use(
      "/api/parking-spaces",
      createParkingSearchRouter(pool)
    );
  });

  test("returns available parking spaces", async () => {
    const res = await request(app)
      .get("/api/parking-spaces/search");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.success).toBe(true);
  });

  test("filters by location", async () => {
    const res = await request(app)
      .get("/api/parking-spaces/search?location=Hamilton");

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("location ILIKE $1"),
      ["%Hamilton%"]
    );
  });

  test("filters by date", async () => {
    const res = await request(app)
      .get("/api/parking-spaces/search?date=2099-10-30");

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("available_date = $1::date"),
      ["2099-10-30"]
    );
  });

  test("combines location and date filters", async () => {
    const res = await request(app)
      .get("/api/parking-spaces/search")
      .query({
        location: "Hamilton",
        date: "2099-10-30"
      });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.any(String),
      ["%Hamilton%", "2099-10-30"]
    );
  });

  test("rejects invalid date", async () => {
    const res = await request(app)
      .get("/api/parking-spaces/search?date=2026-99-99");

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("returns empty search results", async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get("/api/parking-spaces/search");

    expect(res.status).toBe(200);
    expect(res.body.parkingSpaces).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  test("handles database failure", async () => {
    pool.query.mockRejectedValue(
      new Error("Database unavailable")
    );

    const spy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const res = await request(app)
        .get("/api/parking-spaces/search");

      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
    }
  });
});

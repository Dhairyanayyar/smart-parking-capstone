
const express = require("express");
const request = require("supertest");

const mockQuery = jest.fn();

// Mock PostgreSQL so tests do not change real database records.
jest.mock("../db", () => ({
  query: (...args) => mockQuery(...args)
}));

const requireAdmin = require("../middleware/requireAdmin");
const adminParkingRoutes = require("./adminParking");

// Create a test app with a simulated login session.
function createTestApp(userId = null) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    req.session = userId ? { userId } : {};
    next();
  });

  app.use("/api", adminParkingRoutes({ query: mockQuery }));

  app.use((err, req, res, next) => {
    res.status(500).json({ message: "Internal server error." });
  });

  return app;
}

describe("Admin Parking Management API", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test("Rejects users who are not logged in", async () => {
    const response = await request(createTestApp())
      .get("/api/admin/parking-spaces");

    expect(response.status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test("Rejects regular users", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: "user" }]
    });

    const response = await request(createTestApp(1))
      .get("/api/admin/parking-spaces");

    expect(response.status).toBe(403);
  });

  test("Allows administrators to view parking spaces", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: "admin" }]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            location: "Hamilton",
            space_number: "A101",
            price_per_hour: "5.00",
            is_available: true
          }
        ]
      });

    const response = await request(createTestApp(2))
      .get("/api/admin/parking-spaces");

    expect(response.status).toBe(200);
    expect(response.body.parkingSpaces).toHaveLength(1);
  });

  test("Allows administrators to add parking spaces", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: "admin" }]
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, location: "Hamilton" }]
      });

    const response = await request(createTestApp(2))
      .post("/api/admin/parking-spaces")
      .send({
        location: "Hamilton",
        spaceNumber: "A101",
        pricePerHour: 5
      });

    expect(response.status).toBe(201);
    expect(response.body.parkingSpace.id).toBe(1);
  });

  test("Rejects invalid parking space details", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: "admin" }]
    });

    const response = await request(createTestApp(2))
      .post("/api/admin/parking-spaces")
      .send({
        location: "",
        spaceNumber: "A101",
        pricePerHour: -5
      });

    expect(response.status).toBe(400);
  });

  test("Allows administrators to update parking spaces", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: "admin" }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          location: "Burlington",
          space_number: "B102",
          price_per_hour: "7.00",
          is_available: true
        }]
      });

    const response = await request(createTestApp(2))
      .put("/api/admin/parking-spaces/1")
      .send({
        location: "Burlington",
        spaceNumber: "B102",
        pricePerHour: 7,
        isAvailable: true
      });

    expect(response.status).toBe(200);
    expect(response.body.parkingSpace.location).toBe("Burlington");
  });

  test("Returns 404 when updating a missing space", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: "admin" }]
      })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(createTestApp(2))
      .put("/api/admin/parking-spaces/999")
      .send({
        location: "Hamilton",
        spaceNumber: "A101",
        pricePerHour: 5,
        isAvailable: true
      });

    expect(response.status).toBe(404);
  });

  test("Allows administrators to delete parking spaces", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: "admin" }]
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

    const response = await request(createTestApp(2))
      .delete("/api/admin/parking-spaces/1");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Parking space deleted successfully."
    );
  });

  test("Rejects invalid parking space IDs", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: "admin" }]
    });

    const response = await request(createTestApp(2))
      .delete("/api/admin/parking-spaces/invalid");

    expect(response.status).toBe(400);
  });

  test("Returns 404 when deleting a missing space", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: "admin" }]
      })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(createTestApp(2))
      .delete("/api/admin/parking-spaces/999");

    expect(response.status).toBe(404);
  });
});

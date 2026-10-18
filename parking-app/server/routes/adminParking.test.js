
const express = require("express");
const request = require("supertest");

const mockQuery = jest.fn();

// Mock PostgreSQL so tests do not change real database records.
jest.mock("../db", () => ({
  query: (...args) => mockQuery(...args)
}));

const adminParkingRoutes = require("./adminParking");

// Valid parking space information used in multiple tests.
const validParkingSpace = {
  location: "Hamilton",
  address: "123 Main Street, Hamilton",
  spaceNumber: "A101",
  pricePerHour: 5,
  availableDate: "2026-10-20",
  availableFrom: "09:00",
  availableUntil: "17:00"
};

// Create a test app with a simulated login session.
function createTestApp(userId = null) {
  const app = express();

  app.use(express.json());

  app.use((req, res, next) => {
    req.session = userId ? { userId } : {};
    next();
  });

  app.use("/api", adminParkingRoutes({
    query: mockQuery
  }));

  // Handle errors during testing.
  app.use((err, req, res, next) => {
    res.status(500).json({
      message: "Internal server error."
    });
  });

  return app;
}

describe("Admin Parking Management API", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  /**
   * Test 1: Users must be logged in.
   */
  test("Rejects users who are not logged in", async () => {
    const response = await request(createTestApp())
      .get("/api/admin/parking-spaces");

    expect(response.status).toBe(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  /**
   * Test 2: Regular users cannot access admin routes.
   */
  test("Rejects regular users", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: "user" }]
    });

    const response = await request(createTestApp(1))
      .get("/api/admin/parking-spaces");

    expect(response.status).toBe(403);
  });

  /**
   * Test 3: Admin can view parking spaces.
   */
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
            address: "123 Main Street, Hamilton",
            space_number: "A101",
            price_per_hour: "5.00",
            available_date: "2026-10-20",
            available_from: "09:00",
            available_until: "17:00",
            is_available: true
          }
        ]
      });

    const response = await request(createTestApp(2))
      .get("/api/admin/parking-spaces");

    expect(response.status).toBe(200);
    expect(response.body.parkingSpaces).toHaveLength(1);
    expect(response.body.parkingSpaces[0].location)
      .toBe("Hamilton");
  });

  /**
   * Test 4: Admin can add a parking space.
   */
  test("Allows administrators to add parking spaces", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: "admin" }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          ...validParkingSpace
        }]
      });

    const response = await request(createTestApp(2))
      .post("/api/admin/parking-spaces")
      .send(validParkingSpace);

    expect(response.status).toBe(201);
    expect(response.body.parkingSpace.id).toBe(1);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][1]).toEqual([
      "Hamilton",
      "123 Main Street, Hamilton",
      "A101",
      5,
      "2026-10-20",
      "09:00",
      "17:00"
    ]);
  });

  /**
   * Test 5: Invalid parking information is rejected.
   */
  test("Rejects invalid parking space details", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: "admin" }]
    });

    const response = await request(createTestApp(2))
      .post("/api/admin/parking-spaces")
      .send({
        ...validParkingSpace,
        location: "",
        pricePerHour: -5
      });

    expect(response.status).toBe(400);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 6: Admin can update a parking space.
   */
  test("Allows administrators to update parking spaces", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: "admin" }]
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          location: "Burlington",
          address: "456 Brant Street, Burlington",
          space_number: "B102",
          price_per_hour: "7.00",
          available_date: "2026-10-21",
          available_from: "08:00",
          available_until: "18:00",
          is_available: true
        }]
      });

    const response = await request(createTestApp(2))
      .put("/api/admin/parking-spaces/1")
      .send({
        location: "Burlington",
        address: "456 Brant Street, Burlington",
        spaceNumber: "B102",
        pricePerHour: 7,
        availableDate: "2026-10-21",
        availableFrom: "08:00",
        availableUntil: "18:00",
        isAvailable: true
      });

    expect(response.status).toBe(200);
    expect(response.body.parkingSpace.location)
      .toBe("Burlington");

    expect(mockQuery.mock.calls[1][1]).toEqual([
      "Burlington",
      "456 Brant Street, Burlington",
      "B102",
      7,
      "2026-10-21",
      "08:00",
      "18:00",
      true,
      1
    ]);
  });

  /**
   * Test 7: Updating a missing space returns 404.
   */
  test("Returns 404 when updating a missing space", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: "admin" }]
      })
      .mockResolvedValueOnce({
        rows: []
      });

    const response = await request(createTestApp(2))
      .put("/api/admin/parking-spaces/999")
      .send({
        ...validParkingSpace,
        isAvailable: true
      });

    expect(response.status).toBe(404);
  });

  /**
   * Test 8: Admin can delete a parking space.
   */
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

  /**
   * Test 9: Invalid parking IDs are rejected.
   */
  test("Rejects invalid parking space IDs", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: "admin" }]
    });

    const response = await request(createTestApp(2))
      .delete("/api/admin/parking-spaces/invalid");

    expect(response.status).toBe(400);
  });

  /**
   * Test 10: Deleting a missing space returns 404.
   */
  test("Returns 404 when deleting a missing space", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: "admin" }]
      })
      .mockResolvedValueOnce({
        rows: []
      });

    const response = await request(createTestApp(2))
      .delete("/api/admin/parking-spaces/999");

    expect(response.status).toBe(404);
  });

  /**
   * Test 11: Parking address must be provided.
   */
  test("Rejects a missing parking address", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: "admin" }]
    });

    const response = await request(createTestApp(2))
      .post("/api/admin/parking-spaces")
      .send({
        ...validParkingSpace,
        address: ""
      });

    expect(response.status).toBe(400);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 12: Invalid dates must be rejected.
   */
  test("Rejects invalid availability dates", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: "admin" }]
    });

    const response = await request(createTestApp(2))
      .post("/api/admin/parking-spaces")
      .send({
        ...validParkingSpace,
        availableDate: "2026-02-30"
      });

    expect(response.status).toBe(400);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 13: Start time must use a valid format.
   */
  test("Rejects invalid start times", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: "admin" }]
    });

    const response = await request(createTestApp(2))
      .post("/api/admin/parking-spaces")
      .send({
        ...validParkingSpace,
        availableFrom: "25:00"
      });

    expect(response.status).toBe(400);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 14: End time must be later than start time.
   */
  test("Rejects end times earlier than start times", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: "admin" }]
    });

    const response = await request(createTestApp(2))
      .post("/api/admin/parking-spaces")
      .send({
        ...validParkingSpace,
        availableFrom: "18:00",
        availableUntil: "09:00"
      });

    expect(response.status).toBe(400);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 15: Duplicate parking spaces return 409.
   */
  test("Rejects duplicate parking spaces", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ role: "admin" }]
      })
      .mockRejectedValueOnce({
        code: "23505"
      });

    const response = await request(createTestApp(2))
      .post("/api/admin/parking-spaces")
      .send(validParkingSpace);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "Parking space already exists."
    );
  });

  /**
   * Test 16: Administrators must use valid IDs for updates.
   */
  test("Rejects invalid IDs when updating spaces", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: "admin" }]
    });

    const response = await request(createTestApp(2))
      .put("/api/admin/parking-spaces/abc")
      .send({
        ...validParkingSpace,
        isAvailable: true
      });

    expect(response.status).toBe(400);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

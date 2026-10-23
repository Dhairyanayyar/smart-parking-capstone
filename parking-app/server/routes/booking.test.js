
const request = require("supertest");
const express = require("express");
const reservationRoutes = require("./reservations");

describe("Parking Booking API", () => {
  let app;
  let pool;
  let client;

  const validBooking = {
    parkingSpaceId: 3,
    reservationDate: "2099-10-30",
    startTime: "10:00",
    endTime: "11:00"
  };

  const availableSpace = {
    id: 3,
    location: "Hamilton Downtown",
    is_available: true,
    available_date: "2099-10-30",
    available_from: "09:00:00",
    available_until: "17:00:00"
  };

  beforeEach(() => {
    client = {
      query: jest.fn(),
      release: jest.fn()
    };

    pool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(client)
    };

    app = express();
    app.use(express.json());

    // Simulate a logged-in regular user.
    app.use((req, res, next) => {
      req.session = { userId: 16 };
      next();
    });

    app.use("/api", reservationRoutes(pool));
  });

  test("GET returns available parking spaces", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 3,
          location: "Hamilton Downtown",
          space_number: "A101",
          price_per_hour: "7.00",
          available_date: "2099-10-30"
        }
      ]
    });

    const response = await request(app)
      .get("/api/parking-spaces");

    expect(response.statusCode).toBe(200);
    expect(response.body.parkingSpaces).toHaveLength(1);
    expect(response.body.parkingSpaces[0].space_number)
      .toBe("A101");
  });

  test("POST creates a successful reservation", async () => {
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [availableSpace]
      }) // Find parking space
      .mockResolvedValueOnce({
        rows: []
      }) // No conflicting reservation
      .mockResolvedValueOnce({
        rows: [
          {
            id: 4,
            parking_space_id: 3,
            location: "Hamilton Downtown",
            status: "active"
          }
        ]
      }) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app)
      .post("/api/reservations")
      .send(validBooking);

    expect(response.statusCode).toBe(201);
    expect(response.body.message)
      .toBe("Parking booked successfully.");
    expect(response.body.reservation.id).toBe(4);

    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  test("POST rejects overlapping bookings", async () => {
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [availableSpace]
      })
      .mockResolvedValueOnce({
        rows: [{ id: 3 }]
      }) // Existing conflicting booking
      .mockResolvedValueOnce({}); // ROLLBACK

    const response = await request(app)
      .post("/api/reservations")
      .send(validBooking);

    expect(response.statusCode).toBe(409);
    expect(response.body.message)
      .toBe("This space is already booked during that time.");

    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalled();
  });

  test("POST rejects invalid booking times", async () => {
    const response = await request(app)
      .post("/api/reservations")
      .send({
        ...validBooking,
        startTime: "15:00",
        endTime: "10:00"
      });

    expect(response.statusCode).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test("POST rejects an invalid parking space ID", async () => {
    const response = await request(app)
      .post("/api/reservations")
      .send({
        ...validBooking,
        parkingSpaceId: -1
      });

    expect(response.statusCode).toBe(400);
  });

  test("POST rejects a space that is unavailable", async () => {
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [
          {
            ...availableSpace,
            is_available: false
          }
        ]
      })
      .mockResolvedValueOnce({});

    const response = await request(app)
      .post("/api/reservations")
      .send(validBooking);

    expect(response.statusCode).toBe(404);
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
  });

  test("GET reservation history belongs to logged-in user", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 3,
          location: "Hamilton Downtown",
          parking_space_id: 3,
          status: "active"
        }
      ]
    });

    const response = await request(app)
      .get("/api/reservations");

    expect(response.statusCode).toBe(200);
    expect(response.body.reservations).toHaveLength(1);
    expect(pool.query.mock.calls[0][1]).toEqual([16]);
  });

  test("POST rejects unauthenticated users", async () => {
    const guestApp = express();
    guestApp.use(express.json());

    guestApp.use((req, res, next) => {
      req.session = {};
      next();
    });

    guestApp.use("/api", reservationRoutes(pool));

    const response = await request(guestApp)
      .post("/api/reservations")
      .send(validBooking);

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe("Please log in.");
    expect(pool.connect).not.toHaveBeenCalled();
  });
});

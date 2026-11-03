
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

  // TEST 1: Available parking spaces
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

  // TEST 2: Successful booking
  test("POST creates a successful reservation", async () => {
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [availableSpace]
      }) // Lock parking space
      .mockResolvedValueOnce({
        rows: []
      }) // No conflicts
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

  // TEST 3: Reject overlapping bookings
  test("POST rejects overlapping bookings", async () => {
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [availableSpace]
      }) // Lock parking space
      .mockResolvedValueOnce({
        rows: [{ id: 3 }]
      }) // Existing conflict
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

  // TEST 4: Reject invalid booking times
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

  // TEST 5: Reject invalid parking space ID
  test("POST rejects an invalid parking space ID", async () => {
    const response = await request(app)
      .post("/api/reservations")
      .send({
        ...validBooking,
        parkingSpaceId: -1
      });

    expect(response.statusCode).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  // TEST 6: Reject unavailable parking spaces
  test("POST rejects a space that is unavailable", async () => {
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            ...availableSpace,
            is_available: false
          }
        ]
      })
      .mockResolvedValueOnce({}); // ROLLBACK

    const response = await request(app)
      .post("/api/reservations")
      .send(validBooking);

    expect(response.statusCode).toBe(404);
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalled();
  });

  // TEST 7: Reservation history belongs to user
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

  // TEST 8: Reject unauthenticated bookings
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

  // WEEK 8 - TEST 9: Adjacent time slots
  test("POST allows adjacent time slots", async () => {
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [availableSpace]
      }) // Lock parking space
      .mockResolvedValueOnce({
        rows: []
      }) // No overlapping booking
      .mockResolvedValueOnce({
        rows: [
          {
            id: 20,
            parking_space_id: 3,
            status: "active"
          }
        ]
      }) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app)
      .post("/api/reservations")
      .send({
        ...validBooking,
        startTime: "10:00",
        endTime: "11:00"
      });

    expect(response.statusCode).toBe(201);

    // Adjacent bookings must not be treated as overlapping.
    const conflictSQL = client.query.mock.calls[2][0];

    expect(conflictSQL).toContain("start_time < $4::time");
    expect(conflictSQL).toContain("end_time > $3::time");

    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  // WEEK 8 - TEST 10: Cancelled bookings
  test("POST allows a slot with only cancelled bookings", async () => {
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [availableSpace]
      })
      .mockResolvedValueOnce({
        rows: []
      }) // No active conflicts
      .mockResolvedValueOnce({
        rows: [
          {
            id: 21,
            parking_space_id: 3,
            status: "active"
          }
        ]
      }) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app)
      .post("/api/reservations")
      .send(validBooking);

    expect(response.statusCode).toBe(201);

    // Cancelled reservations must not block new bookings.
    const conflictSQL = client.query.mock.calls[2][0];

    expect(conflictSQL).toContain("status = 'active'");
    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  // WEEK 8 - TEST 11: Outside available hours
  test("POST rejects bookings outside available hours", async () => {
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [availableSpace]
      }) // Lock parking space
      .mockResolvedValueOnce({}); // ROLLBACK

    const response = await request(app)
      .post("/api/reservations")
      .send({
        ...validBooking,
        startTime: "08:00",
        endTime: "10:00"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message)
      .toBe("Booking is outside the available date or time.");

    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.query).not.toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });
});

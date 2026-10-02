jest.mock("argon2", () => ({
  verify: jest.fn(),
  hash: jest.fn()
}));

const request = require("supertest");
const express = require("express");
const argon2 = require("argon2");
const profileRoutes = require("./profile");

describe("Profile routes", () => {
  let app;
  let pool;

  beforeEach(() => {
    jest.clearAllMocks();

    pool = {
      query: jest.fn()
    };

    app = express();
    app.use(express.json());

    // Fake logged-in session middleware
    app.use((req, res, next) => {
      req.session = {
     userId: 1
    };

      next();
    });

    app.use("/api", profileRoutes(pool));
  });

  test("GET /profile returns logged-in user's profile", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          first_name: "Dhairya",
          last_name: "Nayyar",
          email: "test@example.com",
          role: "user",
          created_at: new Date()
        }
      ]
    });

    const response = await request(app)
      .get("/api/profile");

    expect(response.statusCode).toBe(200);
    expect(response.body.user.email).toBe("test@example.com");
    expect(response.body.user.first_name).toBe("Dhairya");
  });

  test("GET /profile returns 404 if user is not found", async () => {
    pool.query.mockResolvedValueOnce({
      rows: []
    });

    const response = await request(app)
      .get("/api/profile");

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("User not found.");
  });

  test("PUT /profile updates first and last name", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          first_name: "Dhairya",
          last_name: "Nayyar",
          email: "test@example.com",
          role: "user",
          created_at: new Date()
        }
      ]
    });

    const response = await request(app)
      .put("/api/profile")
      .send({
        firstName: "Dhairya",
        lastName: "Nayyar"
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
      "Profile updated successfully."
    );
  });

  test("PUT /profile rejects missing first name", async () => {
    const response = await request(app)
      .put("/api/profile")
      .send({
        firstName: "",
        lastName: "Nayyar"
      });

    expect(response.statusCode).toBe(400);
  });

  test("PUT /profile rejects missing last name", async () => {
    const response = await request(app)
      .put("/api/profile")
      .send({
        firstName: "Dhairya",
        lastName: ""
      });

    expect(response.statusCode).toBe(400);
  });

  test("PUT /profile/password rejects missing passwords", async () => {
    const response = await request(app)
      .put("/api/profile/password")
      .send({});

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "Current password and new password are required."
    );
  });

  test("PUT /profile/password rejects weak new password", async () => {
    const response = await request(app)
      .put("/api/profile/password")
      .send({
        currentPassword: "OldPassword123!",
        newPassword: "weak"
      });

    expect(response.statusCode).toBe(400);
  });

  test("PUT /profile/password rejects wrong current password", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          password_hash: "stored-hash"
        }
      ]
    });

    argon2.verify.mockResolvedValue(false);

    const response = await request(app)
      .put("/api/profile/password")
      .send({
        currentPassword: "WrongPassword123!",
        newPassword: "NewPassword123!"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      "Current password is incorrect."
    );
  });

  test("PUT /profile/password updates password successfully", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            password_hash: "stored-hash"
          }
        ]
      })
      .mockResolvedValueOnce({
        rowCount: 1
      });

    argon2.verify.mockResolvedValue(true);
    argon2.hash.mockResolvedValue("new-password-hash");

    const response = await request(app)
      .put("/api/profile/password")
      .send({
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!"
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
      "Password updated successfully."
    );
  });
});
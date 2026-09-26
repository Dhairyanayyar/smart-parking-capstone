jest.mock("../mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue()
}));

const request = require("supertest");
const express = require("express");
const passwordResetRoutes = require("./passwordReset");

const {
  sendPasswordResetEmail
} = require("../mailer");

describe("Password reset routes", () => {
  let app;
  let pool;

  beforeEach(() => {
    jest.clearAllMocks();

    pool = {
      query: jest.fn()
    };

    app = express();
    app.use(express.json());
    app.use("/api", passwordResetRoutes(pool));
  });

  test("forgot-password requires email", async () => {
    const response = await request(app)
      .post("/api/forgot-password")
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Email is required.");
  });

  test("forgot-password returns generic response for unknown email", async () => {
    pool.query.mockResolvedValueOnce({
      rows: []
    });

    const response = await request(app)
      .post("/api/forgot-password")
      .send({
        email: "unknown@example.com"
      });

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe(
      "If an account exists for that email, a password reset link has been sent."
    );

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  test("forgot-password sends reset email for existing user", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            email: "test@example.com"
          }
        ]
      })
      .mockResolvedValueOnce({
        rowCount: 1
      })
      .mockResolvedValueOnce({
        rowCount: 1
      });

    const response = await request(app)
      .post("/api/forgot-password")
      .send({
        email: "test@example.com"
      });

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe(
      "If an account exists for that email, a password reset link has been sent."
    );

    expect(response.body.resetToken).toBeUndefined();

    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      "test@example.com",
      expect.any(String)
    );
  });

  test("reset-password requires token", async () => {
    const response = await request(app)
      .post("/api/reset-password")
      .send({
        password: "Password123!"
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "Reset token is required."
    );
  });

  test("reset-password rejects short password", async () => {
    const response = await request(app)
      .post("/api/reset-password")
      .send({
        token: "test-token",
        password: "P@1"
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."
    );
  });

  test("reset-password rejects password without uppercase", async () => {
    const response = await request(app)
      .post("/api/reset-password")
      .send({
        token: "test-token",
        password: "password123!"
      });

    expect(response.statusCode).toBe(400);
  });

  test("reset-password rejects password without lowercase", async () => {
    const response = await request(app)
      .post("/api/reset-password")
      .send({
        token: "test-token",
        password: "PASSWORD123!"
      });

    expect(response.statusCode).toBe(400);
  });

  test("reset-password rejects password without number", async () => {
    const response = await request(app)
      .post("/api/reset-password")
      .send({
        token: "test-token",
        password: "Password!"
      });

    expect(response.statusCode).toBe(400);
  });

  test("reset-password rejects password without special character", async () => {
    const response = await request(app)
      .post("/api/reset-password")
      .send({
        token: "test-token",
        password: "Password123"
      });

    expect(response.statusCode).toBe(400);
  });

  test("reset-password rejects invalid token", async () => {
    pool.query.mockResolvedValueOnce({
      rows: []
    });

    const response = await request(app)
      .post("/api/reset-password")
      .send({
        token: "invalid-token",
        password: "Password123!"
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "Invalid or expired reset token."
    );
  });

  test("reset-password rejects used token", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          user_id: 1,
          expires_at: new Date(Date.now() + 60000),
          used_at: new Date()
        }
      ]
    });

    const response = await request(app)
      .post("/api/reset-password")
      .send({
        token: "used-token",
        password: "Password123!"
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "Invalid or expired reset token."
    );
  });

  test("reset-password rejects expired token", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          user_id: 1,
          expires_at: new Date(Date.now() - 60000),
          used_at: null
        }
      ]
    });

    const response = await request(app)
      .post("/api/reset-password")
      .send({
        token: "expired-token",
        password: "Password123!"
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "Invalid or expired reset token."
    );
  });
});
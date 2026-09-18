jest.mock("../db", () => ({ query: jest.fn() }));

const request = require("supertest");
const argon2 = require("argon2");
const pool = require("../db");
const app = require("../app");

const validUser = {
  firstName: "Dhairya",
  lastName: "Nayyar",
  email: "demo@example.com",
  password: "P@ssword1"
};

beforeEach(() => {
  jest.clearAllMocks();
  pool.query.mockReset();
});

test("creates a regular user with a hashed password and normalized email", async () => {
  pool.query.mockResolvedValue({
    rows: [{ id: 1, email: "demo@example.com", role: "user" }]
  });

  const response = await request(app)
    .post("/api/register")
    .send({
      ...validUser,
      email: " DEMO@example.com ",
      role: "admin"
    });

  expect(response.status).toBe(201);

  const values = pool.query.mock.calls[0][1];

  expect(values[2]).toBe("demo@example.com");
  expect(values[3]).not.toBe(validUser.password);
  expect(await argon2.verify(values[3], validUser.password)).toBe(true);
  expect(values[4]).toBe("user");

  expect(response.body.user).not.toHaveProperty("password_hash");
  expect(response.body.user).not.toHaveProperty("password");
});

test("rejects weak passwords before calling the database", async () => {
  const response = await request(app)
    .post("/api/register")
    .send({ ...validUser, password: "pass" });

  expect(response.status).toBe(400);
  expect(response.body.errors).toHaveProperty("password");
  expect(pool.query).not.toHaveBeenCalled();
});

test("returns 409 when the database rejects a duplicate email", async () => {
  pool.query.mockRejectedValue({
    code: "23505",
    constraint: "users_email_unique"
  });

  const response = await request(app)
    .post("/api/register")
    .send(validUser);

  expect(response.status).toBe(409);
  expect(response.body.message).toBe("Email is already registered.");
});

test("returns a safe error when the database fails", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});

  try {
    pool.query.mockRejectedValue(new Error("Private database details"));

    const response = await request(app)
      .post("/api/register")
      .send(validUser);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      "Unable to create account. Please try again."
    );
  } finally {
    log.mockRestore();
  }
});

test("rejects malformed JSON", async () => {
  const response = await request(app)
    .post("/api/register")
    .set("Content-Type", "application/json")
    .send('{"email":');

  expect(response.status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
});

test("rejects an oversized request", async () => {
  const response = await request(app)
    .post("/api/register")
    .send({ ...validUser, firstName: "A".repeat(11000) });

  expect(response.status).toBe(413);
  expect(pool.query).not.toHaveBeenCalled();
});

test("rejects an empty request", async () => {
  const response = await request(app).post("/api/register");

  expect(response.status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
});
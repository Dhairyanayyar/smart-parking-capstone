jest.mock("../db", () => ({ query: jest.fn() }));

const request = require("supertest");
const argon2 = require("argon2");
const pool = require("../db");
const app = require("../app");

const credentials = {
  email: "demo@example.com",
  password: "P@ssword1"
};

const publicUser = {
  id: 1,
  first_name: "Dhairya",
  last_name: "Nayyar",
  email: "demo@example.com",
  role: "user"
};

let storedUser;

beforeAll(async () => {
  storedUser = {
    ...publicUser,
    password_hash: await argon2.hash(credentials.password)
  };
});

beforeEach(() => pool.query.mockReset());
afterEach(() => jest.restoreAllMocks());

async function logIn(client) {
  pool.query.mockResolvedValueOnce({ rows: [storedUser] });

  return client.post("/api/login").send(credentials);
}

test("logs in and remembers the user on the next request", async () => {
  const client = request.agent(app);
  const login = await logIn(client);

  expect(login.status).toBe(200);
  expect(login.body.user).toEqual(publicUser);
  expect(login.headers["set-cookie"][0]).toContain("HttpOnly");
  expect(login.headers["set-cookie"][0]).toContain("SameSite=Lax");

  pool.query.mockResolvedValueOnce({ rows: [publicUser] });

  const me = await client.get("/api/me");

  expect(me.status).toBe(200);
  expect(me.body.user).toEqual(publicUser);
});

test("rejects a wrong password", async () => {
  pool.query.mockResolvedValueOnce({ rows: [storedUser] });

  const response = await request(app)
    .post("/api/login")
    .send({ ...credentials, password: "WrongPassword1!" });

  expect(response.status).toBe(401);
  expect(response.body.message).toBe("Invalid email or password.");
});

test("rejects an unknown email with the same message", async () => {
  pool.query.mockResolvedValueOnce({ rows: [] });

  const response = await request(app)
    .post("/api/login")
    .send(credentials);

  expect(response.status).toBe(401);
  expect(response.body.message).toBe("Invalid email or password.");
});

test("rejects missing credentials", async () => {
  const response = await request(app)
    .post("/api/login")
    .send({});

  expect(response.status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
});

test("protects me from anonymous access", async () => {
  const response = await request(app).get("/api/me");

  expect(response.status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});

test("logout invalidates the old session cookie", async () => {
  const client = request.agent(app);
  const login = await logIn(client);
  const oldCookie = login.headers["set-cookie"][0].split(";")[0];

  expect((await client.post("/api/logout")).status).toBe(200);

  const response = await request(app)
    .get("/api/me")
    .set("Cookie", oldCookie);

  expect(response.status).toBe(401);
});

test("a successful login creates a new session ID", async () => {
  const client = request.agent(app);
  const first = await logIn(client);
  const second = await logIn(client);

  expect(second.headers["set-cookie"][0].split(";")[0])
    .not.toBe(first.headers["set-cookie"][0].split(";")[0]);
});

test("rejects a session after 16 minutes without requests", async () => {
  const login = await logIn(request(app));
  const cookie = login.headers["set-cookie"][0].split(";")[0];

  pool.query.mockClear();

  jest.spyOn(Date, "now")
    .mockReturnValue(Date.now() + 16 * 60 * 1000);

  const response = await request(app)
    .get("/api/me")
    .set("Cookie", cookie);

  expect(response.status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});
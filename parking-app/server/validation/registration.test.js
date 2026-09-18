const { validateRegistration } = require("./registration");

const validUser = {
  firstName: "Dhairya",
  lastName: "Nayyar",
  email: "dhairya@example.com",
  password: "P@ssword1"
};

test("accepts valid registration details", () => {
  expect(validateRegistration(validUser)).toEqual({});
});

test("accepts a password of exactly eight characters", () => {
  expect(validateRegistration({
    ...validUser,
    password: "Abcdef1!"
  })).toEqual({});
});

test.each([
  ["too short", "Abcde1!"],
  ["no uppercase", "password1!"],
  ["no lowercase", "PASSWORD1!"],
  ["no number", "Password!"],
  ["no special character", "Password1"],
  ["space is not a special character", "Password1 "],
  ["missing password", undefined],
  ["wrong data type", 12345678]
])("rejects password: %s", (description, password) => {
  const errors = validateRegistration({ ...validUser, password });

  expect(errors).toHaveProperty("password");
});

test.each([
  ["firstName", "   "],
  ["lastName", ""],
  ["firstName", "A".repeat(101)],
  ["lastName", "A".repeat(101)],
  ["email", "invalid-email"],
  ["email", "name@@example.com"],
  ["email", "a".repeat(243) + "@example.com"],
  ["firstName", 123]
])("rejects invalid %s: %s", (field, value) => {
  const errors = validateRegistration({
    ...validUser,
    [field]: value
  });

  expect(errors).toHaveProperty(field);
});

test.each([undefined, null, {}])("handles an empty request: %p", (input) => {
  expect(Object.keys(validateRegistration(input))).toHaveLength(4);
});
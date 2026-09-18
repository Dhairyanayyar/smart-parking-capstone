function validateRegistration(input = {}) {
  const data = input && typeof input === "object" ? input : {};
  const errors = {};

  const firstName = typeof data.firstName === "string" ? data.firstName.trim() : "";
  const lastName = typeof data.lastName === "string" ? data.lastName.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const password = typeof data.password === "string" ? data.password : "";

  if (!firstName || firstName.length > 100) {
    errors.firstName = "First name is required and must be at most 100 characters.";
  }

  if (!lastName || lastName.length > 100) {
    errors.lastName = "Last name is required and must be at most 100 characters.";
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address of at most 254 characters.";
  }

  const validPassword =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password);

  if (!validPassword) {
    errors.password =
      "Password must have at least 8 characters, uppercase, lowercase, a number and a special character.";
  }

  return errors;
}

module.exports = { validateRegistration };
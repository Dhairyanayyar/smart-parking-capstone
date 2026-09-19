function newEmail() {
  return `e2e-${Date.now()}-${Cypress._.random(1000000)}@example.com`;
}

const password = "P@ssword1";

function fillRegistration(email, chosenPassword = password) {
  cy.get('[data-cy="firstName"]').type("Test");
  cy.get('[data-cy="lastName"]').type("Student");
  cy.get('[data-cy="email"]').type(email);
  cy.get('[data-cy="password"]').type(chosenPassword, { log: false });
}

describe("Authentication screens", () => {
  it("registers, signs in, survives refresh and signs out", () => {
    const email = newEmail();

    cy.visit("/");
    cy.get('[data-cy="switch-mode"]').click();
    fillRegistration(email);
    cy.get('[data-cy="submit"]').click();

    cy.contains("Account created. Please sign in.")
      .should("be.visible");

    cy.get('[data-cy="password"]').type(password, { log: false });
    cy.get('[data-cy="submit"]').click();

    cy.contains("h1", "Welcome, Test").should("be.visible");

    cy.reload();

    cy.contains("h1", "Welcome, Test").should("be.visible");

    cy.get('[data-cy="logout"]').click();

    cy.contains("h1", "Sign in").should("be.visible");

    cy.request({
      url: "/api/me",
      failOnStatusCode: false
    }).its("status").should("eq", 401);
  });

  it("shows an error for a wrong password", () => {
    const email = newEmail();

    cy.request("POST", "/api/register", {
      firstName: "Test",
      lastName: "Student",
      email,
      password
    });

    cy.visit("/");
    cy.get('[data-cy="email"]').type(email);
    cy.get('[data-cy="password"]').type("WrongPassword1!", {
      log: false
    });
    cy.get('[data-cy="submit"]').click();

    cy.get('[role="alert"]')
      .should("contain", "Invalid email or password.");

    cy.get('[data-cy="logout"]').should("not.exist");
  });

  it("shows the password validation error", () => {
    cy.visit("/");
    cy.get('[data-cy="switch-mode"]').click();
    fillRegistration(newEmail(), "password");
    cy.get('[data-cy="submit"]').click();

    cy.get("#password-error").should("contain", "Password must have");

    cy.contains("h1", "Create an account").should("be.visible");
  });

  it("shows an error when the email is already registered", () => {
    const email = newEmail();

    cy.request("POST", "/api/register", {
      firstName: "Test",
      lastName: "Student",
      email,
      password
    });

    cy.visit("/");
    cy.get('[data-cy="switch-mode"]').click();
    fillRegistration(email);
    cy.get('[data-cy="submit"]').click();

    cy.get('[role="alert"]')
      .should("contain", "Email is already registered.");
  });
});
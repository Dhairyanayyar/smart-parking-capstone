
import AdminDashboard from "./AdminDashboard";
import React, { useEffect, useState } from "react";
import { api } from "./api";

export default function App() {
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  const [screen, setScreen] = useState("account");
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);

  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);

  // Displays an error from the backend.
  function showError(error) {
    setErrors(error.fields || {});

    setNotice({
      type: "error",
      text: error.status
        ? error.message
        : "Unable to reach the service. Please try again."
    });
  }

  // Checks whether the user already has a login session.
  useEffect(() => {
    api("/me")
      .then((data) => setUser(data.user))
      .catch((error) => {
        if (error.status !== 401) {
          showError(error);
        }
      })
      .finally(() => setChecking(false));
  }, []);

  // Expires the client session display after 15 minutes.
  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => {
      setUser(null);
      setScreen("account");

      setNotice({
        type: "error",
        text: "Session expired. Please sign in again."
      });
    }, 15 * 60 * 1000);

    return () => clearTimeout(timer);
  }, [user]);

  // Switches between registration and login.
  function switchMode() {
    setMode(mode === "login" ? "register" : "login");

    setFields((old) => ({
      ...old,
      password: ""
    }));

    setErrors({});
    setNotice(null);
  }

  // Handles registration and login.
  async function submit(event) {
    event.preventDefault();

    setBusy(true);
    setErrors({});
    setNotice(null);

    try {
      if (mode === "register") {
        await api("/register", "POST", fields);

        setMode("login");

        setNotice({
          type: "success",
          text: "Account created. Please sign in."
        });
      } else {
        const data = await api("/login", "POST", {
          email: fields.email,
          password: fields.password
        });

        setUser(data.user);
        setScreen("account");

        setNotice({
          type: "success",
          text: "Signed in successfully."
        });
      }

      setFields((old) => ({
        ...old,
        password: ""
      }));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  // Logs out the current user.
  async function logout() {
    setBusy(true);

    try {
      await api("/logout", "POST");

      setUser(null);
      setReservations([]);
      setScreen("account");

      setNotice({
        type: "success",
        text: "Logged out successfully."
      });
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  // Retrieves the logged-in user's reservation history.
  async function showReservations() {
    setLoadingReservations(true);
    setNotice(null);

    try {
      const data = await api("/reservations");

      setReservations(data.reservations);
      setScreen("reservations");
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        setScreen("account");
      }

      showError(error);
    } finally {
      setLoadingReservations(false);
    }
  }

  // Opens the administrator dashboard.
  function showAdminDashboard() {
    if (!user || user.role !== "admin") {
      return;
    }

    setNotice(null);
    setScreen("admin");
  }

  // Returns to the account page.
  function showAccount() {
    setNotice(null);
    setScreen("account");
  }

  // Formats the reservation date.
  function formatDate(value) {
    if (!value) return "";

    return value.split("T")[0];
  }

  // Formats the reservation time.
  function formatTime(value) {
    if (!value) return "";

    return value.slice(0, 5);
  }

  // Creates a reusable input field.
  function input(name, label, type = "text", autoComplete = "") {
    return (
      <div className="field">
        <label htmlFor={name}>
          {label}
        </label>

        <input
          id={name}
          name={name}
          type={type}
          data-cy={name}
          autoComplete={autoComplete}
          value={fields[name]}
          disabled={busy}
          required
          aria-invalid={Boolean(errors[name])}
          aria-describedby={
            errors[name]
              ? `${name}-error`
              : undefined
          }
          onChange={(event) =>
            setFields({
              ...fields,
              [name]: event.target.value
            })
          }
        />

        {errors[name] && (
          <p
            className="field-error"
            id={`${name}-error`}
          >
            {errors[name]}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <header>
        <span
          className="logo"
          aria-hidden="true"
        >
          P
        </span>

        Smart Parking
      </header>

      <main className="card">
        {checking ? (
          <p role="status">
            Checking your session…
          </p>
        ) : (
          <>
            <p className="eyebrow">
              SMART PARKING MANAGEMENT
            </p>

            {/* Administrator dashboard screen */}
            {user?.role === "admin" && screen === "admin" ? (
              <>
                <button
                  type="button"
                  className="link"
                  onClick={showAccount}
                  data-cy="back-account"
                >
                  Back to Account
                </button>

                <AdminDashboard />
              </>
            ) : user && screen === "reservations" ? (
              /* Reservation history screen */
              <>
                <h1>
                  Reservation History
                </h1>

                {notice && (
                  <p
                    className={notice.type}
                    role={
                      notice.type === "error"
                        ? "alert"
                        : "status"
                    }
                  >
                    {notice.text}
                  </p>
                )}

                <button
                  type="button"
                  className="link"
                  onClick={showAccount}
                  data-cy="back-account"
                >
                  Back to Account
                </button>

                {reservations.length === 0 ? (
                  <p data-cy="no-reservations">
                    You do not have any reservations yet.
                  </p>
                ) : (
                  <div
                    className="reservation-list"
                    data-cy="reservation-list"
                  >
                    {reservations.map((reservation) => (
                      <div
                        className="reservation-card"
                        key={reservation.id}
                        data-cy="reservation-card"
                      >
                        <h3>
                          {reservation.location}
                        </h3>

                        <p>
                          <strong>Date:</strong>{" "}
                          {formatDate(
                            reservation.reservation_date
                          )}
                        </p>

                        <p>
                          <strong>Time:</strong>{" "}
                          {formatTime(
                            reservation.start_time
                          )}{" "}
                          -{" "}
                          {formatTime(
                            reservation.end_time
                          )}
                        </p>

                        <p>
                          <strong>Status:</strong>{" "}
                          {reservation.status}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Account, login, and registration screen */
              <>
                <h1>
                  {user
                    ? `Welcome, ${user.first_name}`
                    : mode === "login"
                      ? "Sign in"
                      : "Create an account"}
                </h1>

                {notice && (
                  <p
                    className={notice.type}
                    role={
                      notice.type === "error"
                        ? "alert"
                        : "status"
                    }
                  >
                    {notice.text}
                  </p>
                )}

                {user ? (
                  <>
                    <p>
                      You are signed in as{" "}
                      <strong>{user.email}</strong>.
                    </p>

                    <button
                      type="button"
                      onClick={showReservations}
                      disabled={loadingReservations}
                      data-cy="view-reservations"
                    >
                      {loadingReservations
                        ? "Loading reservations…"
                        : "View Reservation History"}
                    </button>

                    {/* Only admins see parking management */}
                    {user.role === "admin" && (
                      <button
                        type="button"
                        onClick={showAdminDashboard}
                        data-cy="admin-dashboard"
                      >
                        Manage Parking Spaces
                      </button>
                    )}

                    <button
                      type="button"
                      className="link"
                      onClick={logout}
                      disabled={busy}
                      data-cy="logout"
                    >
                      {busy
                        ? "Signing out…"
                        : "Sign out"}
                    </button>
                  </>
                ) : (
                  <>
                    <form
                      onSubmit={submit}
                      noValidate
                    >
                      {mode === "register" && (
                        <>
                          {input(
                            "firstName",
                            "First name",
                            "text",
                            "given-name"
                          )}

                          {input(
                            "lastName",
                            "Last name",
                            "text",
                            "family-name"
                          )}
                        </>
                      )}

                      {input(
                        "email",
                        "Email",
                        "email",
                        "email"
                      )}

                      {input(
                        "password",
                        "Password",
                        "password",
                        mode === "register"
                          ? "new-password"
                          : "current-password"
                      )}

                      {mode === "register" && (
                        <p className="hint">
                          Use at least 8 characters,
                          including uppercase, lowercase,
                          a number and a special character.
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={busy}
                        data-cy="submit"
                      >
                        {busy
                          ? "Please wait…"
                          : mode === "login"
                            ? "Sign in"
                            : "Create account"}
                      </button>
                    </form>

                    <button
                      type="button"
                      className="link"
                      onClick={switchMode}
                      disabled={busy}
                      data-cy="switch-mode"
                    >
                      {mode === "login"
                        ? "New here? Create an account"
                        : "Already registered? Sign in"}
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer>
        Smart Parking Management
      </footer>
    </div>
  );
}

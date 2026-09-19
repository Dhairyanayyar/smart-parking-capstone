import React, { useEffect, useState } from "react";
import { api } from "./api";

export default function App() {
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);

  function showError(error) {
    setErrors(error.fields || {});

    setNotice({
      type: "error",
      text: error.status
        ? error.message
        : "Unable to reach the service. Please try again."
    });
  }

  // Restore the current session when the page loads.
  useEffect(() => {
    api("/me")
      .then((data) => setUser(data.user))
      .catch((error) => {
        if (error.status !== 401) showError(error);
      })
      .finally(() => setChecking(false));
  }, []);

  // Return to sign-in when this screen's session becomes inactive.
  useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => {
      setUser(null);

      setNotice({
        type: "error",
        text: "Session expired. Please sign in again."
      });
    }, 15 * 60 * 1000);

    return () => clearTimeout(timer);
  }, [user]);

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setFields((old) => ({ ...old, password: "" }));
    setErrors({});
    setNotice(null);
  }

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
      }

      setFields((old) => ({ ...old, password: "" }));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);

    try {
      await api("/logout", "POST");

      setUser(null);

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

  function input(name, label, type = "text", autoComplete = "") {
    return (
      <div className="field">
        <label htmlFor={name}>{label}</label>

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
          aria-describedby={errors[name] ? `${name}-error` : undefined}
          onChange={(event) =>
            setFields({ ...fields, [name]: event.target.value })
          }
        />

        {errors[name] && (
          <p className="field-error" id={`${name}-error`}>
            {errors[name]}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <header>
        <span className="logo" aria-hidden="true">P</span>
        Smart Parking
      </header>

      <main className="card">
        {checking ? (
          <p role="status">Checking your session…</p>
        ) : (
          <>
            <p className="eyebrow">SMART PARKING MANAGEMENT</p>

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
                role={notice.type === "error" ? "alert" : "status"}
              >
                {notice.text}
              </p>
            )}

            {user ? (
              <>
                <p>
                  You are signed in as <strong>{user.email}</strong>.
                </p>

                <button
                  onClick={logout}
                  disabled={busy}
                  data-cy="logout"
                >
                  {busy ? "Signing out…" : "Sign out"}
                </button>
              </>
            ) : (
              <>
                <form onSubmit={submit} noValidate>
                  {mode === "register" && (
                    <>
                      {input("firstName", "First name", "text", "given-name")}
                      {input("lastName", "Last name", "text", "family-name")}
                    </>
                  )}

                  {input("email", "Email", "email", "email")}

                  {input(
                    "password",
                    "Password",
                    "password",
                    mode === "register" ? "new-password" : "current-password"
                  )}

                  {mode === "register" && (
                    <p className="hint">
                      Use at least 8 characters, including uppercase,
                      lowercase, a number and a special character.
                    </p>
                  )}

                  <button type="submit" disabled={busy} data-cy="submit">
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
      </main>

      <footer>Smart Parking Management</footer>
    </div>
  );
}
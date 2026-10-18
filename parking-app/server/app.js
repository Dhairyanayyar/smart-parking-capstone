
const path = require("path");
const fs = require("fs");
const express = require("express");

const adminParkingRoutes = require("./routes/adminParking");
const reservationRoutes = require("./routes/reservations");
const authRoutes = require("./routes/auth");
const sessionMiddleware = require("./session");
const loginRoutes = require("./routes/login");
const passwordResetRoutes = require("./routes/passwordReset");
const profileRoutes = require("./routes/profile");
const pool = require("./db");

const app = express();

// Trust Render's HTTPS reverse proxy in production.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Configure request parsing and session management.
app.use(express.json({ limit: "10kb" }));
app.use(sessionMiddleware);

// Health check endpoint.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Smart Parking backend is running"
  });
});

// Register backend API routes.
app.use("/api", reservationRoutes(pool));
app.use("/api", authRoutes);
app.use("/api", loginRoutes);
app.use("/api", passwordResetRoutes(pool));
app.use("/api", profileRoutes(pool));
app.use("/api", adminParkingRoutes(pool));

// Location of the React production build.
const clientDist = path.join(__dirname, "../client/dist");

// Serve the React application when the build exists.
if (fs.existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist));

  // React handles frontend page navigation.
  app.get(/.*/, (req, res, next) => {
    // Do not return HTML for unknown API endpoints.
    if (req.path === "/api" || req.path.startsWith("/api/")) {
      return res.status(404).json({
        message: "API endpoint not found."
      });
    }

    return res.sendFile(
      path.join(clientDist, "index.html")
    );
  });
} else {
  // Display a simple message before the React build exists.
  app.get("/", (req, res) => {
    res.send("Welcome to Smart Parking!");
  });
}

// Handle invalid JSON, oversized requests, and server errors.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Request must contain valid JSON."
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      message: "Request is too large."
    });
  }

  console.error("Request failed:", err.code || err.name);

  return res.status(500).json({
    message: "Something went wrong. Please try again."
  });
});

module.exports = app;

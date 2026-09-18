const express = require("express");
const authRoutes = require("./routes/auth");

const app = express();

app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.send("Welcome to Smart Parking!");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Smart Parking backend is running"
  });
});

app.use("/api", authRoutes);

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
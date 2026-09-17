const express = require("express");

const app = express();

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Smart Parking backend is running"
  });
});

module.exports = app;
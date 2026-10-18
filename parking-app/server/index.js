
const app = require("./app");

// Use the hosting platform's port or 3001 locally.
const PORT = process.env.PORT || 3001;

// Listen on all network interfaces for deployment.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Smart Parking backend running on port ${PORT}`);
});

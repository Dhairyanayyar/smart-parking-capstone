const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendPasswordResetEmail(email, resetToken) {
  const frontendUrl =
    process.env.FRONTEND_URL || "http://localhost:5173";

  const resetLink =
    `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Smart Parking - Reset Your Password",
    text: `
You requested a password reset for your Smart Parking account.

Reset your password using this link:

${resetLink}

This link expires in 15 minutes.

If you did not request a password reset, you can ignore this email.
    `.trim()
  });
}

module.exports = {
  sendPasswordResetEmail
};
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
};

// ── Email templates ──────────────────────────────────
const sendWelcomeEmail = (user, verifyUrl) =>
  sendEmail({
    to: user.email,
    subject: "Welcome! Please verify your email",
    html: `<h2>Hi ${user.name}!</h2>
           <p>Thanks for signing up. Please verify your email:</p>
           <a href="${verifyUrl}" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify Email</a>
           <p>This link expires in 24 hours.</p>`,
  });

const sendPasswordResetEmail = (user, resetUrl) =>
  sendEmail({
    to: user.email,
    subject: "Password Reset Request",
    html: `<h2>Hi ${user.name},</h2>
           <p>You requested a password reset. Click below (expires in 10 minutes):</p>
           <a href="${resetUrl}" style="background:#EF4444;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a>
           <p>If you didn't request this, ignore this email.</p>`,
  });

const sendOrderConfirmationEmail = (user, order) =>
  sendEmail({
    to: user.email,
    subject: `Order Confirmed – #${order._id}`,
    html: `<h2>Thank you for your order, ${user.name}!</h2>
           <p>Your order <strong>#${order._id}</strong> has been confirmed.</p>
           <p>Total: <strong>$${order.totalPrice.toFixed(2)}</strong></p>
           <p>You'll receive a shipping confirmation once it's on its way.</p>`,
  });

module.exports = { sendEmail, sendWelcomeEmail, sendPasswordResetEmail, sendOrderConfirmationEmail };

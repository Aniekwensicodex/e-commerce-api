require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const { errorHandler } = require("./utils/errorHandler");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const {
  categoryRouter,
  cartRouter,
  orderRouter,
  paymentRouter,
  adminRouter,
} = require("./routes/routes");
const { stripeWebhook } = require("./controllers/paymentController");

const app = express();

// ── Stripe Webhook (raw body required) ──────────────
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body;
    next();
  },
  stripeWebhook
);

// ── Core Middleware ──────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Security ─────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      process.env.CLIENT_URL,
    ],
    credentials: true,
  })
);
app.use(mongoSanitize());
app.use(hpp());

// Rate limiting
// app.set('trust proxy', 1);
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 min
//   max: 100,
//   message: "Too many requests from this IP, please try again in 15 minutes.",
// });
// app.use("/api", limiter);

// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: "Too many auth attempts. Please try again later.",
// });

// ── Logging ──────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── API Routes ───────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/admin", adminRouter);

// ── Health check ─────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "🚀 E-commerce API is running", env: process.env.NODE_ENV })
);

// ── 404 handler ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ─────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`📍 Health: http://localhost:${PORT}/api/health`);
  });
};

start();

module.exports = app;

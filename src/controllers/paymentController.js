const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../models/Order");
const { AppError } = require("../utils/errorHandler");

// POST /api/payments/create-payment-intent
exports.createPaymentIntent = async (req, res, next) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) return next(new AppError("Order not found", 404));
  if (order.user.toString() !== req.user._id.toString()) return next(new AppError("Not authorized", 403));
  if (order.isPaid) return next(new AppError("Order is already paid", 400));

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.totalPrice * 100), // cents
    currency: "usd",
    metadata: {
      orderId: order._id.toString(),
      userId: req.user._id.toString(),
    },
  });

  res.json({
    success: true,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
};

// POST /api/payments/confirm
exports.confirmPayment = async (req, res, next) => {
  const { orderId, paymentIntentId } = req.body;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== "succeeded") {
    return next(new AppError("Payment not completed", 400));
  }

  const order = await Order.findById(orderId);
  if (!order) return next(new AppError("Order not found", 404));
  if (order.user.toString() !== req.user._id.toString()) return next(new AppError("Not authorized", 403));

  order.isPaid = true;
  order.paidAt = Date.now();
  order.status = "processing";
  order.stripePaymentIntentId = paymentIntentId;
  order.paymentResult = {
    id: paymentIntent.id,
    status: paymentIntent.status,
    updateTime: new Date().toISOString(),
    emailAddress: paymentIntent.receipt_email || req.user.email,
  };
  await order.save();

  res.json({ success: true, message: "Payment confirmed", order });
};

// POST /api/payments/webhook  — Stripe webhook (no auth middleware)
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object;
      const order = await Order.findById(intent.metadata.orderId);
      if (order && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.status = "processing";
        order.stripePaymentIntentId = intent.id;
        await order.save();
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      console.log(`❌ Payment failed for order: ${intent.metadata.orderId}`);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const order = await Order.findOne({ stripePaymentIntentId: charge.payment_intent });
      if (order) {
        order.status = "refunded";
        await order.save();
      }
      break;
    }
    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }

  res.json({ received: true });
};

// POST /api/payments/refund/:orderId  [Admin]
exports.refundOrder = async (req, res, next) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) return next(new AppError("Order not found", 404));
  if (!order.isPaid) return next(new AppError("Order is not paid", 400));
  if (!order.stripePaymentIntentId) return next(new AppError("No Stripe payment intent found", 400));

  const refund = await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
  });

  order.status = "refunded";
  await order.save();

  res.json({ success: true, refund, order });
};

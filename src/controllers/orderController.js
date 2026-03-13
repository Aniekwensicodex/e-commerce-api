const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const { AppError } = require("../utils/errorHandler");
const { sendOrderConfirmationEmail } = require("../utils/email");

const TAX_RATE = 0.08;        // 8%
const FREE_SHIPPING_ABOVE = 50;
const SHIPPING_COST = 5.99;

// POST /api/orders
exports.createOrder = async (req, res, next) => {
  const { shippingAddress, paymentMethod, notes } = req.body;

  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart || !cart.items.length) return next(new AppError("Your cart is empty", 400));

  // Validate stock & build order items
  const orderItems = [];
  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isActive) return next(new AppError(`Product no longer available`, 400));
    if (product.stock < item.quantity)
      return next(new AppError(`Insufficient stock for ${product.name}`, 400));
    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.images[0]?.url || "",
      price: product.price,
      quantity: item.quantity,
    });
  }

  const itemsPrice = cart.subtotal;
  const discountAmount = cart.coupon?.discountAmount || 0;
  const shippingPrice = itemsPrice >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_COST;
  const taxPrice = parseFloat(((itemsPrice - discountAmount) * TAX_RATE).toFixed(2));
  const totalPrice = parseFloat((itemsPrice - discountAmount + shippingPrice + taxPrice).toFixed(2));

  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    discountAmount,
    totalPrice,
    coupon: cart.coupon?.code ? { code: cart.coupon.code, discount: cart.coupon.discount } : undefined,
    notes,
  });

  // Decrement stock & increment soldCount
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity, soldCount: item.quantity },
    });
  }

  // Increment coupon usage
  if (cart.coupon?.code) {
    await Coupon.findOneAndUpdate({ code: cart.coupon.code }, { $inc: { usedCount: 1 } });
  }

  // Clear cart
  await Cart.findByIdAndUpdate(cart._id, { items: [], coupon: {} });

  // Send confirmation email
  try { await sendOrderConfirmationEmail(req.user, order); } catch (_) {}

  res.status(201).json({ success: true, order });
};

// GET /api/orders/my-orders
exports.getMyOrders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({ user: req.user._id })
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);
  const total = await Order.countDocuments({ user: req.user._id });

  res.json({ success: true, count: orders.length, total, orders });
};

// GET /api/orders/:id
exports.getOrder = async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) return next(new AppError("Order not found", 404));

  // User can only see their own orders
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return next(new AppError("Not authorized", 403));
  }
  res.json({ success: true, order });
};

// PUT /api/orders/:id/cancel
exports.cancelOrder = async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError("Order not found", 404));
  if (order.user.toString() !== req.user._id.toString()) return next(new AppError("Not authorized", 403));
  if (!["pending", "processing"].includes(order.status)) {
    return next(new AppError("Order cannot be cancelled at this stage", 400));
  }

  order.status = "cancelled";
  await order.save();

  // Restore stock
  for (const item of order.orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity, soldCount: -item.quantity },
    });
  }

  res.json({ success: true, order });
};

// ── Admin routes ─────────────────────────────────────

// GET /api/orders  [Admin]
exports.getAllOrders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const orders = await Order.find(filter)
    .populate("user", "name email")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);
  const total = await Order.countDocuments(filter);

  // Revenue summary
  const revenue = await Order.aggregate([
    { $match: { isPaid: true } },
    { $group: { _id: null, total: { $sum: "$totalPrice" } } },
  ]);

  res.json({
    success: true,
    count: orders.length,
    total,
    revenue: revenue[0]?.total || 0,
    orders,
  });
};

// PUT /api/orders/:id/status  [Admin]
exports.updateOrderStatus = async (req, res, next) => {
  const { status, trackingNumber } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError("Order not found", 404));

  order.status = status;
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (status === "delivered") {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
  }
  await order.save();
  res.json({ success: true, order });
};

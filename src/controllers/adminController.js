const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const { AppError } = require("../utils/errorHandler");

// GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  const [totalUsers, totalProducts, totalOrders, revenue, recentOrders, topProducts] =
    await Promise.all([
      User.countDocuments({ role: "user" }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
      ]),
      Order.find().populate("user", "name email").sort("-createdAt").limit(5),
      Product.find({ isActive: true }).sort("-soldCount").limit(5).select("name soldCount price images"),
    ]);

  const ordersByStatus = await Order.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: revenue[0]?.total || 0,
      paidOrders: revenue[0]?.count || 0,
    },
    ordersByStatus,
    recentOrders,
    topProducts,
  });
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search;

  const filter = {};
  if (search) filter.$or = [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }];

  const users = await User.find(filter).skip(skip).limit(limit).sort("-createdAt");
  const total = await User.countDocuments(filter);
  res.json({ success: true, count: users.length, total, users });
};

// PUT /api/admin/users/:id
exports.updateUser = async (req, res, next) => {
  const { role, isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role, isActive },
    { new: true, runValidators: true }
  );
  if (!user) return next(new AppError("User not found", 404));
  res.json({ success: true, user });
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError("User not found", 404));
  if (user._id.toString() === req.user._id.toString()) {
    return next(new AppError("Cannot delete your own account", 400));
  }
  await user.deleteOne();
  res.json({ success: true, message: "User deleted" });
};

// ── Coupon management ─────────────────────────────────

// GET /api/admin/coupons
exports.getCoupons = async (req, res) => {
  const coupons = await Coupon.find().sort("-createdAt");
  res.json({ success: true, coupons });
};

// POST /api/admin/coupons
exports.createCoupon = async (req, res, next) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, coupon });
};

// PUT /api/admin/coupons/:id
exports.updateCoupon = async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!coupon) return next(new AppError("Coupon not found", 404));
  res.json({ success: true, coupon });
};

// DELETE /api/admin/coupons/:id
exports.deleteCoupon = async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return next(new AppError("Coupon not found", 404));
  await coupon.deleteOne();
  res.json({ success: true, message: "Coupon deleted" });
};

// ── categoryRoutes.js ─────────────────────────────────
const express = require("express");
const catRouter = express.Router();
const {
  getCategories, getCategory, getCategoryProducts,
  createCategory, updateCategory, deleteCategory,
} = require("../controllers/categoryController");
const { protect, authorize } = require("../middleware/auth");

catRouter.get("/", getCategories);
catRouter.get("/:id", getCategory);
catRouter.get("/:id/products", getCategoryProducts);
catRouter.post("/", protect, authorize("admin"), createCategory);
catRouter.put("/:id", protect, authorize("admin"), updateCategory);
catRouter.delete("/:id", protect, authorize("admin"), deleteCategory);

module.exports.categoryRouter = catRouter;

// ── cartRoutes.js ─────────────────────────────────────
const cartExpress = require("express");
const cartRouter = cartExpress.Router();
const {
  getCart, addToCart, updateCartItem, removeFromCart,
  clearCart, applyCoupon, removeCoupon,
} = require("../controllers/cartController");
const { protect: cartProtect } = require("../middleware/auth");

cartRouter.use(cartProtect);
cartRouter.get("/", getCart);
cartRouter.post("/", addToCart);
cartRouter.post("/coupon", applyCoupon);
cartRouter.delete("/coupon", removeCoupon);
cartRouter.delete("/clear", clearCart);
cartRouter.put("/:productId", updateCartItem);
cartRouter.delete("/:productId", removeFromCart);

module.exports.cartRouter = cartRouter;

// ── orderRoutes.js ────────────────────────────────────
const orderExpress = require("express");
const orderRouter = orderExpress.Router();
const {
  createOrder, getMyOrders, getOrder, cancelOrder,
  getAllOrders, updateOrderStatus,
} = require("../controllers/orderController");
const { protect: orderProtect, authorize: orderAuthorize } = require("../middleware/auth");

orderRouter.use(orderProtect);
orderRouter.post("/", createOrder);
orderRouter.get("/my-orders", getMyOrders);
orderRouter.get("/:id", getOrder);
orderRouter.put("/:id/cancel", cancelOrder);

// Admin
orderRouter.get("/", orderAuthorize("admin"), getAllOrders);
orderRouter.put("/:id/status", orderAuthorize("admin"), updateOrderStatus);

module.exports.orderRouter = orderRouter;

// ── paymentRoutes.js ──────────────────────────────────
const paymentExpress = require("express");
const paymentRouter = paymentExpress.Router();
const {
  createPaymentIntent, confirmPayment, refundOrder,
} = require("../controllers/paymentController");
const { protect: payProtect, authorize: payAuthorize } = require("../middleware/auth");

paymentRouter.post("/create-payment-intent", payProtect, createPaymentIntent);
paymentRouter.post("/confirm", payProtect, confirmPayment);
paymentRouter.post("/refund/:orderId", payProtect, payAuthorize("admin"), refundOrder);

module.exports.paymentRouter = paymentRouter;

// ── adminRoutes.js ────────────────────────────────────
const adminExpress = require("express");
const adminRouter = adminExpress.Router();
const {
  getDashboard, getUsers, updateUser, deleteUser,
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
} = require("../controllers/adminController");
const { protect: adminProtect, authorize: adminAuthorize } = require("../middleware/auth");

adminRouter.use(adminProtect, adminAuthorize("admin"));
adminRouter.get("/dashboard", getDashboard);
adminRouter.get("/users", getUsers);
adminRouter.put("/users/:id", updateUser);
adminRouter.delete("/users/:id", deleteUser);
adminRouter.get("/coupons", getCoupons);
adminRouter.post("/coupons", createCoupon);
adminRouter.put("/coupons/:id", updateCoupon);
adminRouter.delete("/coupons/:id", deleteCoupon);

module.exports.adminRouter = adminRouter;

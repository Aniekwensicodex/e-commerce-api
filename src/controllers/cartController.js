const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const { AppError } = require("../utils/errorHandler");

// GET /api/cart
exports.getCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product",
    "name price stock images isActive"
  );

  if (!cart) return res.json({ success: true, cart: { items: [], subtotal: 0, total: 0, itemCount: 0 } });

  // Remove inactive/deleted products
  cart.items = cart.items.filter((i) => i.product && i.product.isActive);
  await cart.save();

  res.json({ success: true, cart });
};

// POST /api/cart  — add or update item
exports.addToCart = async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return next(new AppError("Product ID is required", 400));

  const product = await Product.findById(productId);
  if (!product || !product.isActive) return next(new AppError("Product not found", 404));
  if (product.stock < quantity) return next(new AppError(`Only ${product.stock} items in stock`, 400));

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  const existingItem = cart.items.find((i) => i.product.toString() === productId);

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (newQty > product.stock) return next(new AppError(`Only ${product.stock} items in stock`, 400));
    existingItem.quantity = newQty;
    existingItem.price = product.price;
  } else {
    cart.items.push({
      product: productId,
      quantity,
      price: product.price,
      name: product.name,
      image: product.images[0]?.url || "",
    });
  }

  await cart.save();
  await cart.populate("items.product", "name price stock images isActive");
  res.json({ success: true, message: "Item added to cart", cart });
};

// PUT /api/cart/:productId — update quantity
exports.updateCartItem = async (req, res, next) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) return next(new AppError("Quantity must be at least 1", 400));

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return next(new AppError("Cart not found", 404));

  const item = cart.items.find((i) => i.product.toString() === req.params.productId);
  if (!item) return next(new AppError("Item not in cart", 404));

  const product = await Product.findById(req.params.productId);
  if (quantity > product.stock) return next(new AppError(`Only ${product.stock} items in stock`, 400));

  item.quantity = quantity;
  await cart.save();
  res.json({ success: true, cart });
};

// DELETE /api/cart/:productId — remove item
exports.removeFromCart = async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return next(new AppError("Cart not found", 404));

  cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
  await cart.save();
  res.json({ success: true, message: "Item removed", cart });
};

// DELETE /api/cart — clear cart
exports.clearCart = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], coupon: {} });
  res.json({ success: true, message: "Cart cleared" });
};

// POST /api/cart/coupon — apply coupon
exports.applyCoupon = async (req, res, next) => {
  const { code } = req.body;
  const coupon = await Coupon.findOne({ code: code?.toUpperCase() });
  if (!coupon) return next(new AppError("Invalid coupon code", 404));

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || !cart.items.length) return next(new AppError("Your cart is empty", 400));

  const { valid, message } = coupon.isValid(cart.subtotal);
  if (!valid) return next(new AppError(message, 400));

  const discountAmount = coupon.calculateDiscount(cart.subtotal);
  cart.coupon = { code: coupon.code, discount: coupon.discount, discountAmount };
  await cart.save();

  res.json({
    success: true,
    message: `Coupon applied! You save $${discountAmount.toFixed(2)}`,
    cart,
  });
};

// DELETE /api/cart/coupon — remove coupon
exports.removeCoupon = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { coupon: {} });
  res.json({ success: true, message: "Coupon removed" });
};

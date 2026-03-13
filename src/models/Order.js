const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderItems: [orderItemSchema],
    shippingAddress: addressSchema,

    // Pricing breakdown
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true, default: 0 },
    taxPrice: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },

    // Coupon
    coupon: {
      code: String,
      discount: Number,
    },

    // Payment
    paymentMethod: {
      type: String,
      enum: ["stripe", "paypal", "cod"],
      required: true,
      default: "stripe",
    },
    paymentResult: {
      id: String,
      status: String,
      updateTime: String,
      emailAddress: String,
    },
    stripePaymentIntentId: String,
    isPaid: { type: Boolean, default: false },
    paidAt: Date,

    // Fulfilment status
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "pending",
    },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: Date,

    trackingNumber: String,
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);

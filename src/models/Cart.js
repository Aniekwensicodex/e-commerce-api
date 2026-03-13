const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  price: { type: Number, required: true }, // snapshot at time of adding
  name: { type: String, required: true },  // snapshot
  image: { type: String },                 // snapshot
});

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [cartItemSchema],
    coupon: {
      code: String,
      discount: Number,     // percentage
      discountAmount: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: subtotal
cartSchema.virtual("subtotal").get(function () {
  return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

// Virtual: total (after coupon)
cartSchema.virtual("total").get(function () {
  const sub = this.subtotal;
  if (this.coupon && this.coupon.discountAmount) {
    return Math.max(0, sub - this.coupon.discountAmount);
  }
  return sub;
});

// Virtual: itemCount
cartSchema.virtual("itemCount").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

module.exports = mongoose.model("Cart", cartSchema);

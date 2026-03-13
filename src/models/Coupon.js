const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    discount: { type: Number, required: true, min: 0 },   // % or fixed amount
    minOrderAmount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number },                   // cap for percentage coupons
    usageLimit: { type: Number, default: null },           // null = unlimited
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  },
  { timestamps: true }
);

couponSchema.methods.isValid = function (orderAmount) {
  const now = new Date();
  if (!this.isActive) return { valid: false, message: "Coupon is inactive" };
  if (this.expiresAt < now) return { valid: false, message: "Coupon has expired" };
  if (this.usageLimit && this.usedCount >= this.usageLimit)
    return { valid: false, message: "Coupon usage limit reached" };
  if (orderAmount < this.minOrderAmount)
    return { valid: false, message: `Minimum order amount is $${this.minOrderAmount}` };
  return { valid: true };
};

couponSchema.methods.calculateDiscount = function (subtotal) {
  if (this.type === "percentage") {
    const disc = (subtotal * this.discount) / 100;
    return this.maxDiscountAmount ? Math.min(disc, this.maxDiscountAmount) : disc;
  }
  return Math.min(this.discount, subtotal);
};

module.exports = mongoose.model("Coupon", couponSchema);

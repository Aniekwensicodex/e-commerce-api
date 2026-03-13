const express = require("express");
const router = express.Router();
const {
  getProducts, getProduct, getProductBySlug, getFeaturedProducts,
  createProduct, updateProduct, deleteProduct,
  uploadProductImages, deleteProductImage,
  createReview, deleteReview,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/auth");

router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id", getProduct);

// Admin
router.post("/", protect, authorize("admin"), createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);
router.post("/:id/images", protect, authorize("admin"), ...uploadProductImages);
router.delete("/:id/images/:publicId", protect, authorize("admin"), deleteProductImage);

// Reviews
router.post("/:id/reviews", protect, createReview);
router.delete("/:id/reviews/:reviewId", protect, deleteReview);

module.exports = router;

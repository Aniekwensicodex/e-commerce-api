const Product = require("../models/Product");
const { AppError } = require("../utils/errorHandler");
const APIFeatures = require("../utils/apiFeatures");
const { uploadProductImages, deleteImage } = require("../config/cloudinary");

// GET /api/products
exports.getProducts = async (req, res) => {
  const features = new APIFeatures(
    Product.find({ isActive: true }).populate("category", "name slug"),
    req.query
  )
    .filter()
    .search(["name", "description", "brand", "tags"])
    .sort()
    .limitFields()
    .paginate();

  const total = await Product.countDocuments({ isActive: true });
  const products = await features.query;

  res.json({
    success: true,
    count: products.length,
    total,
    pagination: features.pagination,
    products,
  });
};

// GET /api/products/featured
exports.getFeaturedProducts = async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true })
    .populate("category", "name slug")
    .limit(8)
    .sort("-rating");
  res.json({ success: true, products });
};

// GET /api/products/:id
exports.getProduct = async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate("category", "name slug")
    .populate("reviews.user", "name avatar");
  if (!product || !product.isActive) return next(new AppError("Product not found", 404));
  res.json({ success: true, product });
};

// GET /api/products/slug/:slug
exports.getProductBySlug = async (req, res, next) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true })
    .populate("category", "name slug")
    .populate("reviews.user", "name avatar");
  if (!product) return next(new AppError("Product not found", 404));
  res.json({ success: true, product });
};

// POST /api/products  [Admin]
exports.createProduct = async (req, res, next) => {
  const product = await Product.create({ ...req.body, images: [] });
  res.status(201).json({ success: true, product });
};

// PUT /api/products/:id  [Admin]
exports.updateProduct = async (req, res, next) => {
  let product = await Product.findById(req.params.id);
  if (!product) return next(new AppError("Product not found", 404));
  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.json({ success: true, product });
};

// DELETE /api/products/:id  [Admin]
exports.deleteProduct = async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError("Product not found", 404));

  // Delete images from Cloudinary
  for (const img of product.images) {
    await deleteImage(img.publicId);
  }
  await product.deleteOne();
  res.json({ success: true, message: "Product deleted" });
};

// POST /api/products/:id/images  [Admin]
exports.uploadProductImages = [
  (req, res, next) => {
    uploadProductImages(req, res, (err) => {
      if (err) return next(new AppError(err.message, 400));
      next();
    });
  },
  async (req, res, next) => {
    if (!req.files?.length) return next(new AppError("Please upload at least one image", 400));
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError("Product not found", 404));

    const newImages = req.files.map((f) => ({
      url: f.path,
      publicId: f.filename,
      alt: product.name,
    }));

    product.images.push(...newImages);
    await product.save();
    res.json({ success: true, images: product.images });
  },
];

// DELETE /api/products/:id/images/:publicId  [Admin]
exports.deleteProductImage = async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError("Product not found", 404));

  const publicId = decodeURIComponent(req.params.publicId);
  await deleteImage(publicId);
  product.images = product.images.filter((img) => img.publicId !== publicId);
  await product.save();
  res.json({ success: true, images: product.images });
};

// POST /api/products/:id/reviews
exports.createReview = async (req, res, next) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError("Product not found", 404));

  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );
  if (alreadyReviewed) return next(new AppError("You already reviewed this product", 400));

  product.reviews.push({ user: req.user._id, name: req.user.name, rating, comment });
  product.calculateRating();
  await product.save();
  res.status(201).json({ success: true, message: "Review added" });
};

// DELETE /api/products/:id/reviews/:reviewId
exports.deleteReview = async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError("Product not found", 404));

  const review = product.reviews.id(req.params.reviewId);
  if (!review) return next(new AppError("Review not found", 404));
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return next(new AppError("Not authorized to delete this review", 403));
  }

  review.deleteOne();
  product.calculateRating();
  await product.save();
  res.json({ success: true, message: "Review deleted" });
};

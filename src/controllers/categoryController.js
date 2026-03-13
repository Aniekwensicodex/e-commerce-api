const Category = require("../models/Category");
const Product = require("../models/Product");
const { AppError } = require("../utils/errorHandler");

// GET /api/categories
exports.getCategories = async (req, res) => {
  const categories = await Category.find({ isActive: true, parent: null })
    .populate("children")
    .sort("name");
  res.json({ success: true, count: categories.length, categories });
};

// GET /api/categories/:id
exports.getCategory = async (req, res, next) => {
  const category = await Category.findById(req.params.id).populate("children");
  if (!category) return next(new AppError("Category not found", 404));
  res.json({ success: true, category });
};

// GET /api/categories/:id/products
exports.getCategoryProducts = async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) return next(new AppError("Category not found", 404));

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  const products = await Product.find({ category: req.params.id, isActive: true })
    .skip(skip)
    .limit(limit)
    .sort(req.query.sort || "-createdAt");

  const total = await Product.countDocuments({ category: req.params.id, isActive: true });

  res.json({ success: true, count: products.length, total, products });
};

// POST /api/categories  [Admin]
exports.createCategory = async (req, res, next) => {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, category });
};

// PUT /api/categories/:id  [Admin]
exports.updateCategory = async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) return next(new AppError("Category not found", 404));
  res.json({ success: true, category });
};

// DELETE /api/categories/:id  [Admin]
exports.deleteCategory = async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) return next(new AppError("Category not found", 404));

  const productCount = await Product.countDocuments({ category: req.params.id });
  if (productCount > 0) {
    return next(new AppError(`Cannot delete: ${productCount} products exist in this category`, 400));
  }

  await category.deleteOne();
  res.json({ success: true, message: "Category deleted" });
};

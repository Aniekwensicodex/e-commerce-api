require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");

const seed = async () => {
  await connectDB();

  // Clear existing
  await User.deleteMany();
  await Category.deleteMany();
  await Product.deleteMany();
  console.log("🗑️  Cleared existing data");

  // Admin user
  const admin = await User.create({
    firstName: "Admin",
    lastName: "User",
    email: "admin@store.com",
    password: "admin123456",
    role: "admin",
    isEmailVerified: true,
  });

  // Test user
  await User.create({
    firstName: "Test",
    lastName: "Test User",
    email: "user@store.com",
    password: "user123456",
    role: "user",
    isEmailVerified: true,
  });

  // Categories
  const electronics = await Category.create({ name: "Electronics", description: "Electronic devices and gadgets" });
  const clothing = await Category.create({ name: "Clothing", description: "Fashion and apparel" });
  const books = await Category.create({ name: "Books", description: "Books and literature" });

  // Products
  const products = [
    {
      name: "Wireless Bluetooth Headphones",
      description: "Premium noise-cancelling headphones with 30-hour battery life. Crystal clear sound quality.",
      shortDescription: "Premium noise-cancelling wireless headphones.",
      price: 79.99, comparePrice: 129.99,
      category: electronics._id,
      brand: "SoundTech", stock: 50,
      images: [{ url: "https://via.placeholder.com/800x800?text=Headphones", publicId: "placeholder_1" }],
      isFeatured: true, tags: ["audio", "wireless", "bluetooth"],
       slug: "wireless-bluetooth-headphones"
    },
    {
      name: "Men's Casual T-Shirt",
      description: "100% cotton comfortable everyday t-shirt. Available in multiple colors.",
      price: 24.99,
      category: clothing._id,
      brand: "ComfortWear", stock: 200,
      images: [{ url: "https://via.placeholder.com/800x800?text=T-Shirt", publicId: "placeholder_2" }],
      tags: ["men", "casual", "cotton"],
      slug: "Men's-casual-T-shirt"
    },
    {
      name: "JavaScript: The Good Parts",
      description: "A classic programming book by Douglas Crockford covering the best of JavaScript.",
      price: 19.99,
      category: books._id,
      brand: "O'Reilly", stock: 75,
      images: [{ url: "https://via.placeholder.com/800x800?text=Book", publicId: "placeholder_3" }],
      isFeatured: true, tags: ["programming", "javascript", "coding"],
      slug: "javascript-the-good-parts"
    },
  ];

  await Product.insertMany(products);

  console.log("✅ Seeded successfully!");
  console.log("👤 Admin:  admin@store.com / admin123456");
  console.log("👤 User:   user@store.com  / user123456");
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });

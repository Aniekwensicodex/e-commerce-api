# 🛒 E-Commerce REST API

A full-featured production-ready e-commerce backend built with **Node.js**, **Express**, **MongoDB**, **Cloudinary**, and **Stripe**.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT + HTTP-only Cookies |
| File Uploads | Cloudinary + Multer |
| Payments | Stripe |
| Email | Nodemailer |
| Security | Helmet, HPP, Rate Limiting, Mongo Sanitize |

---

## 📁 Project Structure

```
src/
├── config/
│   ├── db.js               # MongoDB connection
│   └── cloudinary.js       # Cloudinary + Multer setup
├── controllers/
│   ├── authController.js   # Register, login, profile, avatar
│   ├── productController.js# CRUD, images, reviews
│   ├── categoryController.js
│   ├── cartController.js   # Cart + coupon logic
│   ├── orderController.js  # Orders + status management
│   ├── paymentController.js# Stripe PaymentIntents + Webhooks
│   └── adminController.js  # Dashboard, users, coupons
├── middleware/
│   └── auth.js             # JWT protect + role authorization
├── models/
│   ├── User.js
│   ├── Product.js          # With embedded reviews
│   ├── Category.js         # Supports parent/child hierarchy
│   ├── Cart.js             # Virtual subtotal/total
│   ├── Order.js
│   └── Coupon.js           # Percentage & fixed coupons
├── routes/
│   ├── authRoutes.js
│   ├── productRoutes.js
│   └── routes.js           # Category, Cart, Order, Payment, Admin
├── utils/
│   ├── errorHandler.js     # AppError class + global handler
│   ├── apiFeatures.js      # Filter, sort, search, paginate
│   ├── email.js            # Email templates
│   ├── sendToken.js        # JWT cookie helper
│   └── seeder.js           # DB seed script
└── server.js
```

---

## ⚙️ Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Seed the database
```bash
npm run seed
```

### 4. Start the server
```bash
npm run dev       # development (nodemon)
npm start         # production
```

---

## 🔐 Authentication

All protected routes require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

Or via the `token` HTTP-only cookie (set automatically on login).

---

## 📡 API Endpoints

### Auth  `/api/auth`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Login |
| POST | `/logout` | Public | Logout (clears cookie) |
| GET | `/me` | Private | Get current user |
| PUT | `/update-profile` | Private | Update name/address |
| PUT | `/update-password` | Private | Change password |
| PUT | `/upload-avatar` | Private | Upload avatar to Cloudinary |
| POST | `/forgot-password` | Public | Send reset email |
| PUT | `/reset-password/:token` | Public | Reset password |
| GET | `/verify-email/:token` | Public | Verify email |

### Products  `/api/products`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Get all products (filter, sort, search, paginate) |
| GET | `/featured` | Public | Get featured products |
| GET | `/:id` | Public | Get single product |
| GET | `/slug/:slug` | Public | Get product by slug |
| POST | `/` | Admin | Create product |
| PUT | `/:id` | Admin | Update product |
| DELETE | `/:id` | Admin | Delete product |
| POST | `/:id/images` | Admin | Upload images to Cloudinary |
| DELETE | `/:id/images/:publicId` | Admin | Delete a product image |
| POST | `/:id/reviews` | Private | Add review |
| DELETE | `/:id/reviews/:reviewId` | Private | Delete review |

**Query Parameters for GET /products:**
```
?search=headphones        # Full-text search
?category=<id>            # Filter by category
?price[gte]=10&price[lte]=100  # Price range
?sort=-price              # Sort (prefix - for desc)
?page=2&limit=12          # Pagination
?fields=name,price        # Field selection
```

### Categories  `/api/categories`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Get all categories (with children) |
| GET | `/:id` | Public | Get single category |
| GET | `/:id/products` | Public | Get products in category |
| POST | `/` | Admin | Create category |
| PUT | `/:id` | Admin | Update category |
| DELETE | `/:id` | Admin | Delete category |

### Cart  `/api/cart`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Private | Get cart |
| POST | `/` | Private | Add item `{ productId, quantity }` |
| PUT | `/:productId` | Private | Update item quantity |
| DELETE | `/:productId` | Private | Remove item |
| DELETE | `/clear` | Private | Clear cart |
| POST | `/coupon` | Private | Apply coupon `{ code }` |
| DELETE | `/coupon` | Private | Remove coupon |

### Orders  `/api/orders`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Private | Create order from cart |
| GET | `/my-orders` | Private | Get my orders |
| GET | `/:id` | Private | Get order detail |
| PUT | `/:id/cancel` | Private | Cancel order |
| GET | `/` | Admin | Get all orders |
| PUT | `/:id/status` | Admin | Update order status |

### Payments  `/api/payments`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/create-payment-intent` | Private | Create Stripe PaymentIntent |
| POST | `/confirm` | Private | Confirm payment after Stripe.js |
| POST | `/webhook` | Stripe | Stripe webhook handler |
| POST | `/refund/:orderId` | Admin | Issue refund |

### Admin  `/api/admin`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/dashboard` | Admin | Stats, revenue, top products |
| GET | `/users` | Admin | List all users |
| PUT | `/users/:id` | Admin | Update user role/status |
| DELETE | `/users/:id` | Admin | Delete user |
| GET | `/coupons` | Admin | List coupons |
| POST | `/coupons` | Admin | Create coupon |
| PUT | `/coupons/:id` | Admin | Update coupon |
| DELETE | `/coupons/:id` | Admin | Delete coupon |

---

## 💳 Stripe Payment Flow

```
1. POST /api/orders            → Create order (status: pending)
2. POST /api/payments/create-payment-intent  → Get clientSecret
3. Frontend: stripe.confirmCardPayment(clientSecret)
4. POST /api/payments/confirm  → Mark order as paid (status: processing)
5. Webhook handles async events (payment_intent.succeeded, refund, etc.)
```

---

## 🔒 Security Features

- JWT with HTTP-only cookies
- bcrypt password hashing (12 rounds)
- Rate limiting (100 req/15min global, 10 req/15min for auth)
- MongoDB injection prevention (mongo-sanitize)
- XSS protection (helmet)
- HTTP Parameter Pollution prevention (hpp)
- CORS with origin whitelist

---

## 🌱 Seed Credentials

After running `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@store.com | admin123456 |
| User | user@store.com | user123456 |

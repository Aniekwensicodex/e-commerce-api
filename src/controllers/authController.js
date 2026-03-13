const crypto = require("crypto");
const User = require("../models/User");
const { AppError } = require("../utils/errorHandler");
const sendToken = require("../utils/sendToken");
const { sendWelcomeEmail, sendPasswordResetEmail } = require("../utils/email");
const { uploadAvatar, deleteImage } = require("../config/cloudinary");

// POST /api/auth/register
exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError("Email already registered", 400));

  const user = await User.create({ firstName, lastName, email, password });

  // Send verification email
  const verifyToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;
  try { await sendWelcomeEmail(user, verifyUrl); } catch (_) {}

  sendToken(user, 201, res, "Registration successful! Please verify your email.");
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new AppError("Please provide email and password", 400));

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError("Invalid email or password", 401));
  }
  if (!user.isActive) return next(new AppError("Account deactivated. Contact support.", 401));

  sendToken(user, 200, res, "Login successful");
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  res.cookie("token", "none", { expires: new Date(Date.now() + 5000), httpOnly: true });
  res.json({ success: true, message: "Logged out successfully" });
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user });
};

// PUT /api/auth/update-profile
exports.updateProfile = async (req, res, next) => {
  const { name, address } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, address },
    { new: true, runValidators: true }
  );
  res.json({ success: true, user });
};

// PUT /api/auth/update-password
exports.updatePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    return next(new AppError("Current password is incorrect", 401));
  }
  user.password = newPassword;
  await user.save();
  sendToken(user, 200, res, "Password updated successfully");
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError("No user with that email", 404));

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  try {
    await sendPasswordResetEmail(user, resetUrl);
    res.json({ success: true, message: "Password reset email sent" });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("Email could not be sent", 500));
  }
};

// PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) return next(new AppError("Invalid or expired reset token", 400));

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  sendToken(user, 200, res, "Password reset successful");
};

// GET /api/auth/verify-email/:token
exports.verifyEmail = async (req, res, next) => {
  const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpire: { $gt: Date.now() },
  });
  if (!user) return next(new AppError("Invalid or expired verification token", 400));

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();
  res.json({ success: true, message: "Email verified successfully" });
};

// PUT /api/auth/upload-avatar
exports.uploadUserAvatar = [
  (req, res, next) => {
    uploadAvatar(req, res, (err) => {
      if (err) return next(new AppError(err.message, 400));
      next();
    });
  },
  async (req, res, next) => {
    if (!req.file) return next(new AppError("Please upload an image", 400));
    const user = await User.findById(req.user.id);

    // Delete old avatar from Cloudinary
    if (user.avatar.publicId) {
      await deleteImage(user.avatar.publicId);
    }

    user.avatar = { url: req.file.path, publicId: req.file.filename };
    await user.save();
    res.json({ success: true, avatar: user.avatar });
  },
];

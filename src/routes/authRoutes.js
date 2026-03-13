const express = require("express");
const router = express.Router();
const {
  register, login, logout, getMe,
  updateProfile, updatePassword,
  forgotPassword, resetPassword,
  verifyEmail, uploadUserAvatar,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

// Protected
router.use(protect);
router.get("/me", getMe);
router.put("/update-profile", updateProfile);
router.put("/update-password", updatePassword);
router.put("/upload-avatar", ...uploadUserAvatar);

module.exports = router;

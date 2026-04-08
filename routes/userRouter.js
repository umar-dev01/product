const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const router = express.Router();

// =============================================
// PUBLIC ROUTES (No Authentication Required)
// =============================================

// Authentication
router.post("/signup", authController.signup);
router.post("/login", authController.login); // Changed from .get to .post

// Password Reset Flow (all public)
router.post("/forgot-password", authController.forgotPassword); // Request reset code
router.post("/verify-reset-code", authController.verifyResetCode); // Verify code
router.patch("/reset-password", authController.resetPassword); // Set new password

// =============================================
// PROTECTED ROUTES (Authentication Required)
// =============================================
router.use(authController.protect);

// Logged-in password update route (user knows current password)
router.patch("/updateMyPassword", authController.updateMyPassword);

// User Profile Routes
router.get("/me", userController.getMe);
router.patch(
  "/me",
  uploadMiddleware.uploadSingleImage,
  uploadMiddleware.resizeSingleImage,
  userController.updateMe,
);
router.delete("/me", userController.deleteMe);

module.exports = router;

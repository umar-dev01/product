const express = require("express");
const paymentController = require("../controllers/paymentController");
const authController = require("../controllers/authController");

const router = express.Router();

// Stripe webhook uses raw body parser for signature verification.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhook,
);

router.use(authController.protect);
router.post(
  "/create-payment-intent/:orderId",
  paymentController.createPaymentIntent,
);
router.patch("/confirm/:orderId", paymentController.confirmPayment);

module.exports = router;

const express = require("express");
const reviewController = require("../controllers/reviewController");
const authController = require("../controllers/authController");
const router = express.Router();
router.get("/product/:productId", reviewController.getProductReviews);
router.use(authController.protect);
router.get("/my-reviews", reviewController.getMyReviews);

// Review CRUD operations (by ID)
router
  .route("/:reviewId")
  .patch(reviewController.updateReview)
  .delete(reviewController.deleteReview);

module.exports = router;

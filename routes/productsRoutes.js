const express = require("express");
const productController = require("../controllers/productController");
const authController = require("../controllers/authController");
const validate = require("../middleware/validate.middleware");
const { createProductSchema } = require("../validator/product.validator");
const reviewController = require("../controllers/reviewController");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const router = express.Router();

// Public Routes
router.route("/").get(productController.getProducts);

router.route("/:id").get(productController.getOneProducts);
router
  .route("/:productId/reviews")
  .get(reviewController.getProductReviews) // Public
  .post(authController.protect, reviewController.createReview); // Private

// Admin Protected Routes
router.use(authController.protect);
router.use(authController.restrictTo("admin"));
router
  .route("/")
  .post(
    uploadMiddleware.uploadMultipleImages,
    uploadMiddleware.resizeMultipleImages,
    validate(createProductSchema),
    productController.createProduct,
  );
router
  .route("/:id")
  .patch(productController.updateProduct)
  .delete(productController.deleteProduct);

module.exports = router;

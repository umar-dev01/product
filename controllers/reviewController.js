const Review = require("../models/reviewModel");
const Product = require("../models/productModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
exports.createReview = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const { review, rating } = req.body;

  // 1) Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  // 2) Check if user already reviewed this product
  const existingReview = await Review.findOne({
    product: productId,
    user: req.user.id,
  });

  if (existingReview) {
    return next(new AppError("You have already reviewed this product", 400));
  }

  // 3) Create review
  const newReview = await Review.create({
    review,
    rating,
    product: productId,
    user: req.user.id,
  });

  res.status(201).json({
    status: "success",
    data: {
      review: newReview,
    },
  });
});
exports.getProductReviews = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const reviews = await Review.find({ product: productId }).sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: {
      reviews,
    },
  });
});
exports.updateReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  const { review, rating } = req.body;

  // Find review and check if user owns it
  const existingReview = await Review.findById(reviewId);

  if (!existingReview) {
    return next(new AppError("Review not found", 404));
  }

  // Check if user owns this review or is admin
  if (
    existingReview.user.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new AppError("You are not authorized to update this review", 403),
    );
  }

  // Update review
  const updatedReview = await Review.findByIdAndUpdate(
    reviewId,
    { review, rating },
    { new: true, runValidators: true },
  );

  res.status(200).json({
    status: "success",
    data: {
      review: updatedReview,
    },
  });
});
exports.deleteReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;

  // Find review and check if user owns it
  const review = await Review.findById(reviewId);

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  // Check if user owns this review or is admin
  if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new AppError("You are not authorized to delete this review", 403),
    );
  }

  await review.deleteOne();

  res.status(204).json({
    status: "success",
    data: null,
  });
});
exports.getMyReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ user: req.user.id })
    .populate("product", "name images price")
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: reviews.length,
    data: {
      reviews,
    },
  });
});

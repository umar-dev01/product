const Wishlist = require("../models/wishlistModel");
const Product = require("../models/productModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
exports.getWishlist = catchAsync(async (req, res, next) => {
  let wishlist = await Wishlist.findOne({ user: req.user.id }).populate(
    "products",
    "name price images stock ratingsAverage",
  );

  // If no wishlist exists, create empty one
  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: req.user.id,
      products: [],
    });
  }

  res.status(200).json({
    status: "success",
    results: wishlist.products.length,
    data: {
      wishlist,
    },
  });
});
exports.addToWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  // 1) Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError("Product not found", 404));

    // res.status(404).json({
    //   status: "fail",
    //   message: "Product not found",
    // });
  }

  // 2) Find or create wishlist
  let wishlist = await Wishlist.findOne({ user: req.user.id });
  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: req.user.id,
      products: [],
    });
  }

  // 3) Check if product already in wishlist
  if (wishlist.products.includes(productId)) {
    return next(new AppError("Product already in wishlist", 400));
  }

  // 4) Add product to wishlist
  wishlist.products.push(productId);
  await wishlist.save();

  // 5) Populate product details
  await wishlist.populate("products", "name price images stock");

  res.status(200).json({
    status: "success",
    data: {
      wishlist,
    },
  });
});
exports.removeFromWishlist = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user.id });
  if (!wishlist) {
    return next(new AppError("Wishlist not found", 404));
  }

  // Remove product from array
  wishlist.products = wishlist.products.filter(
    (id) => id.toString() !== productId,
  );

  await wishlist.save();

  res.status(200).json({
    status: "success",
    data: {
      wishlist,
    },
  });
});
exports.clearWishlist = catchAsync(async (req, res, next) => {
  const wishlist = await Wishlist.findOne({ user: req.user.id });
  if (!wishlist) {
    return next(new AppError("Wishlist not found", 404));
  }

  wishlist.products = [];
  await wishlist.save();

  res.status(200).json({
    status: "success",
    data: {
      wishlist,
    },
  });
});

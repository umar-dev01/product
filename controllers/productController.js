const Product = require("../models/productModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const normalizeProductImages = (productDoc) => {
  const product = productDoc.toObject ? productDoc.toObject() : productDoc;
  const legacyImage =
    typeof product.image === "string" && product.image.trim() !== ""
      ? product.image
      : "";
  const normalizedImages =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : legacyImage
        ? [legacyImage]
        : [];

  return {
    ...product,
    images: normalizedImages,
    image: normalizedImages[0] || "",
  };
};

exports.createProduct = catchAsync(async (req, res, next) => {
  const product = await Product.create(req.body);
  res.status(201).json(normalizeProductImages(product));
});
exports.getProducts = catchAsync(async (req, res, next) => {
  const queryObj = { ...req.query };
  const excludedFields = ["page", "sort", "limit", "fields", "keyword"];
  excludedFields.forEach((field) => delete queryObj[field]);

  // Convert operators to Mongo format
  let queryStr = JSON.stringify(queryObj).replace(
    /\b(gte|gt|lte|lt)\b/g,
    (match) => `$${match}`,
  );
  let filter = JSON.parse(queryStr);

  // Convert price values to number
  if (filter.price) {
    Object.keys(filter.price).forEach((key) => {
      filter.price[key] = Number(filter.price[key]);
    });
  }

  // Text search for certain fields
  const textFields = ["category", "color", "type"];
  textFields.forEach((field) => {
    if (filter[field] && typeof filter[field] === "string") {
      filter[field] = { $regex: filter[field], $options: "i" };
    }
  });

  // Keyword search
  if (req.query.keyword) {
    filter.name = { $regex: req.query.keyword, $options: "i" };
  }

  let query = Product.find(filter);

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-createdAt");
  }

  // Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    query = query.select(fields);
  } else {
    query = query.select("-__v");
  }

  // Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  const products = await query;
  const normalizedProducts = products.map(normalizeProductImages);
  const totalProducts = await Product.countDocuments(filter);

  res.status(200).json({
    status: "success",
    results: normalizedProducts.length,
    page,
    totalPages: Math.ceil(totalProducts / limit),
    totalProducts,
    products: normalizedProducts,
  });
});

exports.getOneProducts = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new AppError("Product not found", 404));
  }
  res.json(normalizeProductImages(product));
});
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("Product not found", 404));
  }

  await product.deleteOne();
  res.json({ message: "Product removed" });
});
exports.updateProduct = catchAsync(async (req, res, next) => {
  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true },
  );

  if (!updatedProduct) {
    return next(new AppError("Product not found", 404));
  }
  res.json(normalizeProductImages(updatedProduct));
});

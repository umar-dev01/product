const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
exports.getCart = catchAsync(async (req, res, next) => {
  let cart = await Cart.findOne({ user: req.user.id }).populate(
    "items.product",
    "name price stock images",
  );

  // If no cart exists, create empty one
  if (!cart) {
    cart = await Cart.create({
      user: req.user.id,
      items: [],
      totalPrice: 0,
      totalItems: 0,
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      cart,
    },
  });
});
exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  // 1) Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError("Product not found", 404));
  }
  if (product.stock < quantity) {
    return next(
      new AppError(`Only ${product.stock} items available in stock`, 400),
    );
  }
  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    cart = await Cart.create({
      user: req.user.id,
      items: [],
    });
  }
  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId,
  );
  if (existingItemIndex > -1) {
    // Update quantity if product exists
    cart.items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item if product doesn't exist
    cart.items.push({
      product: productId,
      name: product.name,
      price: product.price,
      quantity,
      image: product.images?.[0] || "",
    });
  }
  await cart.save();
  await cart.populate("items.product", "name price stock images");
  res.status(200).json({
    status: "success",
    data: {
      cart,
    },
  });
});
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  // 1) Find cart
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  // 2) Find item in cart
  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId,
  );

  if (itemIndex === -1) {
    return next(new AppError("Item not found in cart", 404));
  }

  // 3) Check stock if increasing quantity
  if (quantity > cart.items[itemIndex].quantity) {
    const product = await Product.findById(cart.items[itemIndex].product);
    const newQuantity = quantity;
    const currentQuantity = cart.items[itemIndex].quantity;
    const increaseBy = newQuantity - currentQuantity;

    if (product.stock < increaseBy) {
      return next(
        new AppError(
          `Only ${product.stock} more items available in stock`,
          400,
        ),
      );
    }
  }

  // 4) Update or remove item
  if (quantity <= 0) {
    // Remove item if quantity is 0 or negative
    cart.items.splice(itemIndex, 1);
  } else {
    // Update quantity
    cart.items[itemIndex].quantity = quantity;
  }

  // 5) Save cart
  await cart.save();
  await cart.populate("items.product", "name price stock images");

  res.status(200).json({
    status: "success",
    data: {
      cart,
    },
  });
});
exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    status: "success",
    data: {
      cart,
    },
  });
});
exports.removeFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }

  // Remove item
  cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

  await cart.save();
  await cart.populate("items.product", "name price stock images");

  res.status(200).json({
    status: "success",
    data: {
      cart,
    },
  });
});

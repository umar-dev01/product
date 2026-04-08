const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
exports.createOrder = catchAsync(async (req, res, next) => {
  const {
    //products = orderItems
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;
  // Validation
  if (!orderItems || orderItems.length === 0) {
    return next(new AppError("No order items", 400));
  }
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      return next(new AppError(`Product not found: ${item.name}`, 404));
    }
    if (product.stock < item.quantity) {
      return next(
        new AppError(
          `Not enough stock for ${product.name}. Available: ${product.stock}`,
          400,
        ),
      );
    }
  }

  const order = await Order.create({
    user: req.user.id, // From auth middleware (logged in user)
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  });
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }
  res.status(201).json({
    status: "success",
    data: {
      order,
    },
  });
});
exports.getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ user: req.user.id }).sort("-createdAt");
  res.status(200).json({
    status: "success",
    results: orders.length,
    data: {
      orders,
    },
  });
});

exports.getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email",
  );

  if (!order) {
    return next(new AppError("Order not found", 404));
  }
  if (!order.user) {
    return next(
      new AppError("The user belonging to this order no longer exists", 404),
    );
  }
  // Check if user owns this order or is admin
  if (order.user._id.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new AppError("You are not authorized to view this order", 403));
  }

  res.status(200).json({
    status: "success",
    data: {
      order,
    },
  });
});
exports.updateOrderToPaid = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: req.body.id,
    status: req.body.status,
    update_time: req.body.update_time,
    email_address: req.body.email_address,
  };

  const updatedOrder = await order.save();

  res.status(200).json({
    status: "success",
    data: {
      order: updatedOrder,
    },
  });
});
exports.updateOrderToDelivered = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.orderStatus = "delivered";

  const updatedOrder = await order.save();

  res.status(200).json({
    status: "success",
    data: {
      order: updatedOrder,
    },
  });
});
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({})
    .populate("user", "name email")
    .sort("-createdAt");

  // Calculate total sales
  //.rduce is array method to add valuse
  const totalSales = orders.reduce((acc, order) => acc + order.totalPrice, 0);

  res.status(200).json({
    status: "success",
    results: orders.length,
    totalSales,
    data: {
      orders,
    },
  });
});

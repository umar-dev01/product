const Stripe = require("stripe");
const Order = require("../models/orderModel");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/email");
const AppError = require("../utils/appError");

const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError("Stripe is not configured", 500);
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
};
exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError("Order not found", 404));
  }
  if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new AppError("You are not authorized to pay for this order", 403),
    );
  }

  if (order.isPaid) {
    return next(new AppError("Order is already paid", 400));
  }
  if (order.paymentMethod !== "card") {
    return next(
      new AppError("Stripe payment is available only for card orders", 400),
    );
  }

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.totalPrice * 100),
    currency: "pkr",
    metadata: {
      orderId: order._id.toString(),
      userId: req.user.id,
    },
  });
  res.status(200).json({
    status: "success",
    clientSecret: paymentIntent.client_secret,
  });
});
exports.stripeWebhook = catchAsync(async (req, res, next) => {
  const signature = req.headers["stripe-signature"];
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.log("❌ Missing webhook secret");
    return next(new AppError("Webhook secret not configured", 500));
  }

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    console.log("✅ Webhook signature verified");
  } catch (err) {
    console.log("❌ Webhook signature verification failed:", err.message);
    return next(new AppError(`Webhook Error: ${err.message}`, 400));
  }
  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    console.log("💰 Payment succeeded!");
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;

    // Update order to paid
    await Order.findByIdAndUpdate(orderId, {
      isPaid: true,
      paidAt: Date.now(),
      paymentResult: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        update_time: new Date().toISOString(),
        email_address: paymentIntent.receipt_email || "",
      },
    });
  }

  res.status(200).json({ received: true });
});
exports.confirmPayment = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { paymentIntentId } = req.body;

  // 1) Find the order
  const order = await Order.findById(orderId).populate("user", "name email");
  if (!order) {
    return next(new AppError("Order not found", 404));
  }
  if (order.user._id.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new AppError("You are not authorized to confirm this payment", 403),
    );
  }
  if (order.isPaid) {
    return next(new AppError("Order is already paid", 400));
  }
  if (order.paymentMethod !== "card") {
    return next(
      new AppError(
        "Stripe confirmation is available only for card orders",
        400,
      ),
    );
  }

  // 2) Verify payment intent with Stripe
  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    return next(
      new AppError(
        `Payment not successful. Status: ${paymentIntent.status}`,
        400,
      ),
    );
  }
  if (paymentIntent.metadata.orderId !== order._id.toString()) {
    return next(new AppError("Payment intent does not match this order", 400));
  }
  if (
    req.user.role !== "admin" &&
    paymentIntent.metadata.userId !== order.user._id.toString()
  ) {
    return next(new AppError("Payment intent does not match this user", 403));
  }

  // 3) Update order to paid
  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: paymentIntent.id,
    status: paymentIntent.status,
    update_time: new Date().toISOString(),
    email_address: paymentIntent.receipt_email || order.user.email,
  };
  await order.save();

  // 4) Send confirmation email
  await sendEmail({
    email: order.user.email,
    subject: "Order Confirmation - Payment Successful",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Thank you for your order!</h2>
        <p>Hi ${order.user.name},</p>
        <p>Your payment has been successfully processed.</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Total Paid:</strong> $${order.totalPrice}</p>
        <hr>
        <small>E-Commerce Store</small>
      </div>
    `,
  });

  res.status(200).json({
    status: "success",
    data: { order },
  });
});

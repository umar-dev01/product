const User = require("../models/usersModel");
const catchAsync = require("../utils/catchAsync");
const crypto = require("crypto");
const sendEmail = require("../utils/email");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const signtoken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, status, res) => {
  const token = signtoken(user._id);
  const cookiesOption = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookiesOption.secure = true;
  res.cookie("jwt", token, cookiesOption);
  user.password = undefined;
  res.status(status).json({
    status: "success",
    token,
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  if (!req.body.phone) {
    return next(new AppError("Please provide a phone number", 400));
  }

  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone || "",
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  createSendToken(newUser, 201, res);
});
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }
  const user = await User.findOne({
    email: email,
  }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }
  createSendToken(user, 200, res);
});
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new AppError("You are not logged in", 401));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id).select("+image");
  if (!currentUser) {
    return next(new AppError("User no longer exists", 401));
  }
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401),
    );
  }
  req.user = currentUser;
  next();
});
exports.restrictTo = (...role) => {
  return (req, res, next) => {
    if (!role.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }
    next();
  };
};
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("No user found with that email address", 404));
  }
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");
  user.passwordResetToken = hashedCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });
  try {
    const message = `Your password reset code is: ${resetCode}\nThis code is valid for 10 minutes.\nIf you didn't request this, please ignore this email.`;
    await sendEmail({
      email: user.email,
      subject: "Your Password Reset Code (valid for 10 minutes)",
      message,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Use the code below:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold;">
            ${resetCode}
          </div>
          <p>This code is valid for <strong>10 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <small>E-Commerce Support Team</small> 
        </div>
      `,
    });
    res.status(200).json({
      status: "success",
      message: "Reset code sent to email",
    });
  } catch (err) {
    console.log("EMAIL ERROR:", err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "There was an error sending the email. Try again later.",
        500,
      ),
    );
  }
});
exports.verifyResetCode = catchAsync(async (req, res, next) => {
  const hashedCode = crypto
    .createHash("sha256")
    .update(String(req.body.code))
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedCode,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError("Code is invalid or has expired", 400));
  }
  res.status(200).json({
    status: "success",
    message: "Code verified successfully",
    resetAllowed: true,
    email: user.email, // Send email back so frontend knows which user
  });
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // ✅ match what frontend actually sends
  const { email, code, password, passwordConfirm } = req.body;

  const hashedCode = crypto
    .createHash("sha256")
    .update(String(code))
    .digest("hex");
  const user = await User.findOne({
    email,
    passwordResetToken: hashedCode,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Code is invalid or has expired", 400));
  }

  user.password = password; // ✅ was newPassword
  user.passwordConfirm = passwordConfirm; // ✅ was newPasswordConfirm
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
});

// Update password for logged-in user (requires current password)
exports.updateMyPassword = catchAsync(async (req, res, next) => {
  const { currentPassword, password, passwordConfirm } = req.body;

  // Validate required fields using request payload (no hardcoded defaults)
  if (!currentPassword || !password || !passwordConfirm) {
    return next(
      new AppError(
        "Please provide currentPassword, password and passwordConfirm",
        400,
      ),
    );
  }

  const user = await User.findById(req.user.id).select("+password");

  if (!user || !(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError("Your current password is incorrect", 401));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});

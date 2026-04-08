const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "User must have a name"],
  },
  email: {
    type: String,
    required: [true, "User must have an email"],
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: false, // ← Change to false
    unique: false, // ← Remove unique constraint
    sparse: true, // ← Allows multiple null values
    trim: true,
  },
  image: {
    type: String,
    default: null,
  },
  password: {
    type: String,
    required: [true, "User must have a password"],
    minlength: 8,
    select: false, // never expose password in queries
  },
  passwordConfirm: {
    type: String,
    required: [true, "User must confirm their password"],
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  active: {
    type: Boolean,
    default: true,
    select: false, // Won't show in queries unless specifically asked
  },
});

// ✅ ONE pre-save hook, nothing else below it except the model export
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return;

  if (
    this.passwordConfirm !== undefined &&
    this.password !== this.passwordConfirm
  ) {
    return next(new Error("Passwords do not match"));
  }

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
});
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return;
  this.passwordChangedAt = Date.now() - 1000;
});
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};
const User = mongoose.model("User", userSchema);
module.exports = User;

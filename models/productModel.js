const mongoose = require("mongoose");
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product must have a name"],
    },
    price: {
      type: Number,
      required: [true, "Product must have a price"],
    },
    category: {
      type: String,
      required: [true, "Product must have a category"],
    },
    description: {
      type: String,
      required: [true],
    },
    images: { type: [String], default: [] },
    stock: {
      type: Number,

      required: true,
      default: 0,
    },
    ratingsAverage: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be below 0"],
      max: [5, "Rating cannot be above 5"],
      set: (val) => Math.round(val * 10) / 10, // Round to 1 decimal place
    },
    numReviews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);
const Product = mongoose.model("Product", productSchema);
module.exports = Product;

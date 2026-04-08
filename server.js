const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/usersModel");
const Product = require("./models/productModel");
const app = require("./app");

const DB = process.env.DATABASE.replace(
  "<db_PASSWORD>",
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB)
  .then(() => console.log(`DB connection successful!`))
  .catch((err) => {
    console.log("DB connection error:", err.message);
  });

app.get("/", (req, res) => {
  res.send("api is running");
});
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => process.exit(1));
});

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "config.env") });
const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/usersModel");
const Product = require("./models/productModel");
const app = require("./app");

const databaseTemplate = process.env.DATABASE || process.env.DATABASE_LOCAL;

if (!databaseTemplate) {
  throw new Error(
    "DATABASE or DATABASE_LOCAL missing. Check environment variables.",
  );
}

if (
  databaseTemplate.includes("<db_PASSWORD>") &&
  !process.env.DATABASE_PASSWORD
) {
  throw new Error("DATABASE_PASSWORD missing. Check environment variables.");
}

const DB = databaseTemplate.includes("<db_PASSWORD>")
  ? databaseTemplate.replace("<db_PASSWORD>", process.env.DATABASE_PASSWORD)
  : databaseTemplate;

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

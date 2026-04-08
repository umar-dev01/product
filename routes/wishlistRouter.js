const express = require("express");
const wishlistController = require("../controllers/wishListController");
const authController = require("../controllers/authController");
const router = express.Router();
router.use(authController.protect);

router
  .route("/")
  .get(wishlistController.getWishlist)
  .delete(wishlistController.clearWishlist);

router
  .route("/:productId")
  .post(wishlistController.addToWishlist)
  .delete(wishlistController.removeFromWishlist);

module.exports = router;

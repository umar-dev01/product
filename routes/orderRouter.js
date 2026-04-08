const express = require("express");
const orderController = require("../controllers/orderController");
const authController = require("../controllers/authController");
const router = express.Router();
router.use(authController.protect);
//work sign =w
//..User router
router.route("/my-orders").get(orderController.getMyOrders); //w
router.route("/").post(orderController.createOrder); //w
router.route("/:id").get(orderController.getOrderById); //w
router.route("/:id/pay").patch(orderController.updateOrderToPaid); //give orderid to params and pymant od to body
router.use(authController.restrictTo("admin"));
router.route("/").get(orderController.getAllOrders);
router.route("/:id/deliver").patch(orderController.updateOrderToDelivered);
module.exports = router;

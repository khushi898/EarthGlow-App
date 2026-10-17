import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ========================================
// CREATE NEW ORDER
// ========================================
router.post("/", protect, async (req, res, next) => {
  try {
    for (const item of req.body.items){
      const product=await Product.findById(item.product);
      if(!product){
        return res.status(404).json({
          message:`Product not found!`,

        });
      }
      if(product.stock<item.quantity){
        return res.status(400).json({
          message:`Not enough stock for ${product.name}`,
        });
      }
      product.stock-=item.quantity;
      await product.save();
    }
    const order = await Order.create({
      ...req.body,
      user: req.user._id,
      status: "Placed",
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

// ========================================
// GET LOGGED-IN USER'S ORDERS
// ========================================
router.get("/my", protect, async (req, res, next) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    }).sort({
      createdAt: -1,
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

// ========================================
// ADMIN - GET ALL CUSTOMER ORDERS
// ========================================
router.get("/", protect, adminOnly, async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({
        createdAt: -1,
      });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

// ========================================
// ADMIN - UPDATE ORDER STATUS
// ========================================
router.patch("/:id/status", protect, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Placed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    order.status = status;

    await order.save();

    res.json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
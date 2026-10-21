import express from 'express';
import mongoose from 'mongoose';

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';

import {
  protect,
  adminOnly
} from '../middleware/authMiddleware.js';

const router = express.Router();
const MAX_QUANTITY = 100;
const MAX_ITEMS = 50;

const money = value =>
  Math.round((value + Number.EPSILON) * 100);

function orderError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// CREATE ORDER
router.post('/', protect, async (req, res, next) => {
  let session;

  try {
    const {
      items,
      shippingAddress,
      checkoutRequestId
    } = req.body || {};

    if (
      typeof checkoutRequestId !== 'string' ||
      !/^[a-f0-9-]{36}$/i.test(checkoutRequestId)
    ) {
      return res.status(400).json({
        message: 'Invalid checkout request ID.'
      });
    }

    // Return an existing order for repeated requests.
    const existingOrder = await Order.findOne({
      user: req.user._id,
      checkoutRequestId
    });

    if (existingOrder) {
      return res.json({ order: existingOrder });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > MAX_ITEMS
    ) {
      return res.status(400).json({
        message: 'Invalid shopping bag.'
      });
    }

    if (
      !shippingAddress ||
      ['fullName', 'line1', 'city', 'postcode', 'country']
        .some(key =>
          typeof shippingAddress[key] !== 'string' ||
          !shippingAddress[key].trim() ||
          shippingAddress[key].length > 200
        )
    ) {
      return res.status(400).json({
        message: 'Please enter valid delivery details.'
      });
    }

    const seen = new Set();

    for (const item of items) {
      if (
        !item ||
        !mongoose.isValidObjectId(item.product) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > MAX_QUANTITY
      ) {
        return res.status(400).json({
          message: 'Invalid product or quantity.'
        });
      }

      const id = String(item.product);

      if (seen.has(id)) {
        return res.status(400).json({
          message: 'Duplicate products in order.'
        });
      }

      seen.add(id);
    }

    session = await mongoose.startSession();

    let createdOrder;

    await session.withTransaction(async () => {
      // Verify selected products exist in this user's cart.
      const cart = await Cart.findOne({
        user: req.user._id
      }).session(session);

      if (!cart) {
        throw orderError('Shopping bag not found.');
      }

      for (const item of items) {
        const cartItem = cart.items.find(
          entry =>
            String(entry.product) === String(item.product)
        );

        if (
          !cartItem ||
          cartItem.quantity < item.quantity
        ) {
          throw orderError(
            'Your shopping bag has changed. Please refresh it.'
          );
        }
      }

      const orderItems = [];
      let totalPence = 0;

      for (const item of items) {
        const product = await Product.findOneAndUpdate(
          {
            _id: item.product,
            stock: { $gte: item.quantity }
          },
          {
            $inc: { stock: -item.quantity }
          },
          {
            new: true,
            session
          }
        );

        if (!product) {
          const exists = await Product.findById(
            item.product
          ).session(session);

          if (!exists) {
            throw orderError('Product not found.', 404);
          }

          throw orderError(
            `Not enough stock for ${exists.name}.`
          );
        }

        if (
          !Number.isFinite(product.price) ||
          product.price < 0
        ) {
          throw orderError('Invalid product price.');
        }

        const unitPence = money(product.price);
        totalPence += unitPence * item.quantity;

        orderItems.push({
          product: product._id,
          name: product.name,
          image: product.image,
          unitPrice: unitPence / 100,
          quantity: item.quantity
        });
      }

      // Remove purchased quantities only.
      // Unselected products remain in the shopping bag.
      for (const item of items) {
        const cartItem = cart.items.find(
          entry =>
            String(entry.product) === String(item.product)
        );

        cartItem.quantity -= item.quantity;
      }

      cart.items = cart.items.filter(
        entry => entry.quantity > 0
      );

      await cart.save({ session });

      const orders = await Order.create(
        [{
          user: req.user._id,
          checkoutRequestId,
          items: orderItems,
          total: totalPence / 100,
          shippingAddress: {
            fullName: shippingAddress.fullName.trim(),
            line1: shippingAddress.line1.trim(),
            city: shippingAddress.city.trim(),
            postcode: shippingAddress.postcode.trim(),
            country: shippingAddress.country.trim()
          },
          status: 'Placed'
        }],
        { session }
      );

      createdOrder = orders[0];
    });

    return res.status(201).json({
      order: createdOrder
    });

  } catch (error) {
    // A concurrent request may have created this order.
    if (error.code === 11000) {
      const existing = await Order.findOne({
        user: req.user._id,
        checkoutRequestId: req.body?.checkoutRequestId
      });

      if (existing) {
        return res.json({ order: existing });
      }
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message
      });
    }

    next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

// CUSTOMER — MY ORDERS
router.get('/my', protect, async (req, res, next) => {
  try {
    const orders = await Order.find({
      user: req.user._id
    }).sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

// ADMIN — ALL ORDERS
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

// ADMIN — UPDATE ORDER STATUS
router.patch(
  '/:id/status',
  protect,
  adminOnly,
  async (req, res, next) => {
    try {
      const { status } = req.body;

      const allowedStatuses = [
        'Placed',
        'Processing',
        'Shipped',
        'Delivered',
        'Cancelled'
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: 'Invalid order status'
        });
      }

      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({
          message: 'Order not found'
        });
      }

      order.status = status;
      await order.save();

      return res.json({
        message: 'Order status updated successfully',
        order
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
import { Router } from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();
router.use(protect);

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

router.get('/', async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    await cart.populate('items.product');
    res.json({ cart });
  } catch (error) { next(error); }
});

router.post('/items', async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const qty = Number(quantity);
    if (!productId || !Number.isInteger(qty) || qty < 1) return res.status(400).json({ message: 'Valid productId and positive integer quantity are required' });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.stock < qty) return res.status(400).json({ message: 'Not enough stock available' });
    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.find(i => i.product.toString() === productId);
    if (item) {
      if (item.quantity + qty > product.stock) return res.status(400).json({ message: 'Quantity exceeds available stock' });
      item.quantity += qty;
    } else cart.items.push({ product: product._id, quantity: qty });
    await cart.save();
    await cart.populate('items.product');
    res.json({ cart });
  } catch (error) { next(error); }
});

router.patch('/items/:productId', async (req, res, next) => {
  try {
    const qty = Number(req.body.quantity);
    if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ message: 'Quantity must be a positive integer' });
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (qty > product.stock) return res.status(400).json({ message: 'Quantity exceeds available stock' });
    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.find(i => i.product.toString() === req.params.productId);
    if (!item) return res.status(404).json({ message: 'Item not in cart' });
    item.quantity = qty;
    await cart.save();
    await cart.populate('items.product');
    res.json({ cart });
  } catch (error) { next(error); }
});

router.delete('/items/:productId', async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = cart.items.filter(i => i.product.toString() !== req.params.productId);
    await cart.save();
    await cart.populate('items.product');
    res.json({ cart });
  } catch (error) { next(error); }
});
export default router;

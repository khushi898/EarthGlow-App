import { Router } from 'express';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

const MAX_RESTOCK = 10000;

// Query values can arrive as objects (?category[$ne]=x), so accept plain strings only.
const queryText = value => (typeof value === 'string' ? value.trim() : '');

// Treat the search as literal text, not as a regular expression.
const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res, next) => {
  try {
    const { page = '1', limit = '12', featured } = req.query;
    const category = queryText(req.query.category);
    const search = escapeRegex(queryText(req.query.search).slice(0, 100));
    const filter = {};
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(48, Math.max(1, Number.parseInt(limit, 10) || 12));
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ featured: -1, createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize),
      Product.countDocuments(filter)
    ]);
    res.json({ products, page: pageNumber, pages: Math.ceil(total / pageSize), total });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (error) { next(error); }
});

router.post('/', protect, adminOnly, async (req, res, next) => {
  try { res.status(201).json({ product: await Product.create(req.body) }); }
  catch (error) { next(error); }
});

router.patch('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (error) { next(error); }
});

// $inc is atomic, so a restock cannot overwrite stock changed by an order at the same moment.
router.post('/:id/restock', protect, adminOnly, async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_RESTOCK) {
      return res.status(400).json({ message: `Quantity must be a whole number from 1 to ${MAX_RESTOCK}` });
    }
    const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { stock: quantity } }, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (error) { next(error); }
});

router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) { next(error); }
});

export default router;

import { Router } from 'express';
import Product from '../models/Product.js';

const router = Router();
router.get('/', async (_req, res, next) => {
  try {
    const categories = await Product.distinct('category');
    res.json({ categories });
  } catch (error) { next(error); }
});
export default router;

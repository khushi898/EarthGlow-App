import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Product from './models/Product.js';

const products = [
  { name: 'Aloe Calm Face Wash', slug: 'aloe-calm-face-wash', description: 'A gentle daily cleanser for a fresh, comfortable feel.', category: 'Face Care', price: 7.99, compareAtPrice: 9.99, image: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80', stock: 40, featured: true },
  { name: 'Vitamin C Glow Serum', slug: 'vitamin-c-glow-serum', description: 'A lightweight serum for a bright-looking skincare routine.', category: 'Serums', price: 12.99, compareAtPrice: 15.99, image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80', stock: 25, featured: true },
  { name: 'Daily Hydration Cream', slug: 'daily-hydration-cream', description: 'A nourishing moisturiser for everyday hydration.', category: 'Moisturisers', price: 10.49, compareAtPrice: null, image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=80', stock: 30, featured: true },
  { name: 'Rose Water Toner', slug: 'rose-water-toner', description: 'A refreshing toner to add a light, fresh step to your routine.', category: 'Face Care', price: 6.99, compareAtPrice: null, image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80', stock: 35, featured: false },
  { name: 'Coconut Hair Mask', slug: 'coconut-hair-mask', description: 'A creamy hair treatment for a smooth-feeling finish.', category: 'Hair Care', price: 9.49, compareAtPrice: 11.99, image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=900&q=80', stock: 20, featured: true },
  { name: 'Shea Body Lotion', slug: 'shea-body-lotion', description: 'A daily body lotion with a soft, comforting texture.', category: 'Body Care', price: 8.49, compareAtPrice: null, image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=80', stock: 28, featured: false },
  { name: 'Gentle Baby Wash', slug: 'gentle-baby-wash', description: 'A mild wash made for a gentle bath-time routine.', category: 'Baby Care', price: 6.49, compareAtPrice: null, image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80', stock: 18, featured: false },
  { name: 'Tea Tree Spot Gel', slug: 'tea-tree-spot-gel', description: 'A targeted gel for a simple skincare routine.', category: 'Face Care', price: 5.99, compareAtPrice: null, image: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80', stock: 32, featured: false }
];

try {
  await mongoose.connect(process.env.MONGO_URI);
  await Product.deleteMany({});
  await Product.insertMany(products);
  const email = 'admin@earthglow.local';
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  await User.findOneAndUpdate({ email }, { name: 'EarthGlow Admin', email, passwordHash, role: 'admin' }, { upsert: true, new: true });
  console.log(`Seeded ${products.length} products and demo admin ${email}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

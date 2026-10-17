import 'dotenv/config';
import mongoose from 'mongoose';
import Product from './models/Product.js';

const brokenPhoto = 'photo-1526947425960-945c6e728858';

const replacementImage =
  'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80';

async function fixImages() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const result = await Product.updateMany(
      { image: { $regex: brokenPhoto } },
      { $set: { image: replacementImage } }
    );

    console.log(`Updated ${result.modifiedCount} product images.`);
  } catch (error) {
    console.error('Image update failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

fixImages();
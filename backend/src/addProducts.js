import 'dotenv/config';
import mongoose from 'mongoose';
import Product from './models/Product.js';

// Images stored in frontend/public/images
const imagePath = (filename) => `/images/${filename}`;

const products = [
  // FACE CARE
  ['Vitamin C Brightening Face Wash', 'Face Care', 9.99, 35, 'vitamin-c-brightening-face-wash.webp'],
  ['Rose Glow Face Cream', 'Face Care', 12.49, 30, 'rose-glow-face-cream.webp'],
  ['Green Tea Purifying Cleanser', 'Face Care', 7.99, 45, 'green-tea-purifying-cleanser.webp'],
  ['Rose Hydrating Face Toner', 'Face Care', 8.99, 40, 'rose-hydrating-face-toner.webp'],
  ['Shea Butter Moisturizing Face Cream', 'Face Care', 12.99, 35, 'shea-butter-moisturizing-face-cream.webp'],
  ['Walnut Almond Face Scrub', 'Face Care', 9.99, 35, 'walnut-almond-face-scrub.webp'],
  ['Green Tea Oil Control Face Gel', 'Face Care', 8.99, 40, 'green-tea-oil-control-face-gel.webp'],
  ['Turmeric Sandalwood Face Wash', 'Face Care', 9.49, 40, 'turmeric-sandalwood-face-wash.webp'],
  ['Coffee Coconut Face Scrub', 'Face Care', 10.99, 30, 'coffee-coconut-face-scrub.webp'],
  ['Oatmeal Honey Face Scrub', 'Face Care', 10.49, 35, 'oatmeal-honey-face-scrub.webp'],
  ['Aloe Vera Cucumber Facial Toner', 'Face Care', 8.49, 40, 'aloe-vera-cucumber-facial-toner.webp'],
  ['Micellar Cleansing Water', 'Face Care', 9.99, 45, 'micellar-cleansing-water.webp'],
  ['Tea Tree Aloe Face Gel', 'Face Care', 9.49, 40, 'tea-tree-aloe-face-gel.webp'],
  ['Aloe Vera Cucumber Face Moisturizer', 'Face Care', 11.99, 35, 'aloe-vera-cucumber-face-moisturizer.webp'],
  ['Sunscreen SPF50', 'Face Care', 13.99, 40, 'sunscreen-spf50.webp'],
  ['Aloe Vera Cucumber Face Mask', 'Face Care', 11.49, 35, 'aloe-vera-cucumber-face-mask.webp'],
  ['Turmeric Aloe Vera Face Mask', 'Face Care', 11.99, 35, 'turmeric-aloe-vera-face-mask.webp'],
  ['Rose Water Face Toner', 'Face Care', 8.99, 45, 'rose-water-face-toner.webp'],
  ['Detoxifying Clay Face Mask', 'Face Care', 12.49, 30, 'detoxifying-clay-face-mask.webp'],
  ['Tea Tree Neem Face Cleanser', 'Face Care', 9.99, 40, 'tea-tree-neem-face-cleanser.webp'],
  ['Saffron Almond Night Cream', 'Face Care', 15.49, 30, 'saffron-almond-night-cream.webp'],

  // SERUMS
  ['Vitamin C Brightening Face Serum', 'Serums', 16.99, 30, 'vitamin-c-brightening-face-serum.webp'],
  ['Rose Brightening Face Serum', 'Serums', 14.99, 35, 'rose-brightening-face-serum.webp'],
  ['Vitamin C Face Serum', 'Serums', 15.99, 35, 'vitamin-c-face-serum.webp'],
  ['Aloe Vera Cucumber Serum', 'Serums', 13.99, 40, 'aloe-vera-cucumber-serum.webp'],

  // BODY CARE
  ['Aloe Soothing Body Wash', 'Body Care', 7.49, 50, 'aloe-soothing-body-wash.webp'],
  ['Coconut Body Scrub', 'Body Care', 10.99, 30, 'coconut-body-scrub.webp'],
  ['Lavender Body Lotion', 'Body Care', 8.99, 40, 'lavender-body-lotion.webp'],
  ['Rose Hand Cream', 'Body Care', 5.99, 45, 'rose-hand-cream.webp'],

  // HAIR CARE
  ['Coconut Nourishing Shampoo', 'Hair Care', 10.49, 40, 'coconut-nourishing-shampoo.webp'],
  ['Shea Butter Hair Conditioner', 'Hair Care', 9.49, 35, 'shea-butter-hair-conditioner.webp'],

  // LIP CARE
  ['Nourishing Lip Balm', 'Face Care', 5.99, 40, 'nourishing-lip-balm.webp'],
  ['Strawberry Lip Scrub', 'Face Care', 5.99, 40, 'strawberry-lip-balm.webp'],

  // FACE OIL
  ['Argan Radiant Face Oil', 'Face Care', 13.99, 30, 'argan-radiant-face-oil.webp']
];

const slugify = (name) =>
  name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from .env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    let added = 0;
    let updated = 0;

    for (const [name, category, price, stock, filename] of products) {
      const slug = slugify(name);
      const image = imagePath(filename);

      const existing = await Product.findOne({ slug });

      if (existing) {
        await Product.updateOne(
          { _id: existing._id },
          {
            $set: {
              name,
              category,
              brand: 'EarthGlow',
              image,
              images: [image]
            }
          }
        );

        updated++;
        console.log(`Updated: ${name}`);
      } else {
        await Product.create({
          name,
          slug,
          category,
          price,
          stock,
          brand: 'EarthGlow',
          image,
          images: [image],
          description: `${name} for your everyday botanical beauty routine.`,
          featured: false,
          benefits: [],
          ingredients: [],
          howToUse: ''
        });

        added++;
        console.log(`Added: ${name}`);
      }
    }

    console.log('-------------------------');
    console.log(`Added: ${added}`);
    console.log(`Updated: ${updated}`);
    console.log('EarthGlow products completed!');
  } catch (error) {
    console.error('Product update failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from './models/Product.js';

const image = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const products = [
  { name: 'Aloe Vera Hydrating Gel',
     category: 'Face Care',
      price: 8.99,
      stock: 40,
      featured: true,
      image: image('photo-1608248543803-ba4f8c70ae0b'),brand: "EarthGlow",
      images: [
    image("photo-1608248543803-ba4f8c70ae0b"),
    image("photo-1556229010-6c3f2c9ca5f8"),
    image("photo-1620916566398-39f1143ab7be")
],
    size: "200 ml",

benefits: [
  "Helps skin feel hydrated",
  "Lightweight and refreshing",
  "Suitable for a daily skincare routine"
],
ingredients: [
  "Aloe Vera"
],
howToUse: "Apply a small amount to clean skin and gently massage." },
  { name: 'Vitamin C Brightening Face Wash', category: 'Face Care', price: 9.99, stock: 35, image: image('photo-1556229010-6c3f2c9ca5f8') },
  { name: 'Rose Glow Face Cream', category: 'Face Care', price: 12.49, stock: 30, image: image('photo-1601049541289-9b1b7bbbfe19') },
  { name: 'Green Tea Purifying Cleanser', category: 'Face Care', price: 7.99, stock: 45, image: image('photo-1556229010-6c3f2c9ca5f8') },

  { name: 'Argan Oil Hair Serum', category: 'Hair Care', price: 13.99, stock: 25, featured: true, image: image('photo-1526947425960-945c6e728858') },
  { name: 'Coconut Nourishing Shampoo', category: 'Hair Care', price: 10.49, stock: 40, image: image('photo-1608248543803-ba4f8c70ae0b') },
  { name: 'Rosemary Scalp Oil', category: 'Hair Care', price: 11.99, stock: 30, image: image('photo-1526947425960-945c6e728858') },
  { name: 'Shea Butter Hair Conditioner', category: 'Hair Care', price: 9.49, stock: 35, image: image('photo-1601049541289-9b1b7bbbfe19') },

  { name: 'Lavender Body Lotion', category: 'Body Care', price: 8.99, stock: 40, image: image('photo-1601049541289-9b1b7bbbfe19') },
  { name: 'Coconut Body Scrub', category: 'Body Care', price: 10.99, stock: 30, image: image('photo-1556229010-6c3f2c9ca5f8') },
  { name: 'Aloe Soothing Body Wash', category: 'Body Care', price: 7.49, stock: 50, image: image('photo-1608248543803-ba4f8c70ae0b') },
  { name: 'Rose Hand Cream', category: 'Body Care', price: 5.99, stock: 45, image: image('photo-1601049541289-9b1b7bbbfe19') },

  { name: 'Gentle Baby Shampoo', category: 'Baby Care', price: 6.99, stock: 30, image: image('photo-1608248543803-ba4f8c70ae0b') },
  { name: 'Baby Soft Moisturising Lotion', category: 'Baby Care', price: 7.49, stock: 35, image: image('photo-1601049541289-9b1b7bbbfe19') },
  { name: 'Baby Gentle Bath Wash', category: 'Baby Care', price: 6.49, stock: 40, image: image('photo-1556229010-6c3f2c9ca5f8') },
  { name: 'Baby Nourishing Massage Oil', category: 'Baby Care', price: 8.49, stock: 25, image: image('photo-1526947425960-945c6e728858') },

  { name: 'Niacinamide Balance Serum', category: 'Serums', price: 14.99, stock: 30, featured: true, image: image('photo-1608248543803-ba4f8c70ae0b') },
  { name: 'Hyaluronic Acid Hydration Serum', category: 'Serums', price: 15.99, stock: 25, image: image('photo-1601049541289-9b1b7bbbfe19') },
  { name: 'Rosehip Glow Serum', category: 'Serums', price: 13.49, stock: 35, image: image('photo-1526947425960-945c6e728858') },
  { name: 'Vitamin E Repair Serum', category: 'Serums', price: 12.99, stock: 30, image: image('photo-1556229010-6c3f2c9ca5f8') },

  {
  name: "Rose Glow Face Cleanser",
  category: "Face Care",
  price: 9.99,
  stock: 45,
  image: image("photo-1608248543803-ba4f8c70ae0b")
},
{
  name: "Vitamin C Brightening Cream",
  category: "Face Care",
  price: 14.99,
  stock: 35,
  image: image("photo-1556229010-6c3f2c9ca5f8")
},
{
  name: "Green Tea Purifying Mask",
  category: "Face Care",
  price: 11.49,
  stock: 40,
  image: image("photo-1620916566398-39f1143ab7be")
},
{
  name: "Coconut Repair Shampoo",
  category: "Hair Care",
  price: 10.99,
  stock: 50,
  image: image("photo-1596462502278-27bfdc403348")
},
{
  name: "Argan Smooth Conditioner",
  category: "Hair Care",
  price: 11.99,
  stock: 42,
  image: image("photo-1601049541289-9b1b7bbbfe19")
},
{
  name: "Rosemary Scalp Oil",
  category: "Hair Care",
  price: 13.49,
  stock: 32,
  image: image("photo-1571781926291-c477ebfd024b")
},
{
  name: "Shea Butter Body Lotion",
  category: "Body Care",
  price: 12.99,
  stock: 55,
  image: image("photo-1556228578-0d85b1a4d571")
},
{
  name: "Lavender Body Wash",
  category: "Body Care",
  price: 8.99,
  stock: 60,
  image: image("photo-1596462502278-27bfdc403348")
},
{
  name: "Cocoa Butter Body Cream",
  category: "Body Care",
  price: 14.49,
  stock: 38,
  image: image("photo-1608248543803-ba4f8c70ae0b")
},
{
  name: "Baby Soft Moisturising Cream",
  category: "Baby Care",
  price: 7.99,
  stock: 48,
  image: image("photo-1601049541289-9b1b7bbbfe19")
},
{
  name: "Baby Gentle Shampoo",
  category: "Baby Care",
  price: 6.99,
  stock: 52,
  image: image("photo-1556229010-6c3f2c9ca5f8")
},
{
  name: "Baby Nourishing Body Lotion",
  category: "Baby Care",
  price: 8.49,
  stock: 44,
  image: image("photo-1620916566398-39f1143ab7be")
},
{
  name: "Hyaluronic Hydration Serum",
  category: "Serums",
  price: 15.99,
  stock: 36,
  image: image("photo-1571781926291-c477ebfd024b")
},
{
  name: "Vitamin C Glow Serum",
  category: "Serums",
  price: 16.99,
  stock: 30,
  image: image("photo-1556228578-0d85b1a4d571")
},
{
  name: "Niacinamide Clarifying Serum",
  category: "Serums",
  price: 14.99,
  stock: 40,
  image: image("photo-1608248543803-ba4f8c70ae0b")
}
];

async function main() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from your .env file');
    }

    await mongoose.connect(process.env.MONGO_URI);

    let added = 0;
    let skipped = 0;

    for (const product of products) {
      const slug = product.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

  const extraDetails = {
  brand: product.brand ?? "EarthGlow",
  size: product.size ?? "",
  ...(product.images?.length
    ? {images:product.images}
    :{}
  ),
  benefits: product.benefits ?? [],
  ingredients: product.ingredients ?? [],
  howToUse: product.howToUse ?? ""
};

const existingProduct = await Product.findOne({ slug });

if (existingProduct) {
  await Product.updateOne(
    { slug },
    {
      $set: Object.fromEntries(
        Object.entries(extraDetails).filter(
          ([key, value]) =>
            key !=="_id" &&
            value !== "" &&
            (!Array.isArray(value) || value.length > 0)
        )
      )
    }
  );

  skipped++;
  continue;
}
const result = await Product.create({
  name: product.name,
  category: product.category,
  price: product.price,
  stock: product.stock,
  image: product.image,
  compareAtPrice: product.compareAtPrice ?? null,
  slug,
  description: `${product.name} for your everyday botanical beauty routine.`,
  featured: product.featured ?? false,
  ...extraDetails
});

added++;
    }
  console.log(`Added ${added} products. Skipped ${skipped} existing products.`);
  } catch (error) {
    console.error('Failed to add products:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, default: null, min: 0 },
  image: { type: String, required: true },
  images: {
  type: [String],
  default: []
},
brand: {
  type: String,
  default: "EarthGlow"
},
size: {
  type: String,
  default: ""
},
benefits: {
  type: [String],
  default: []
},
ingredients: {
  type: [String],
  default: []
},
howToUse: {
  type: String,
  default: ""
},
  stock: { type: Number, default: 0, min: 0 },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);

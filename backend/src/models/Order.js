import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  checkoutRequestId: {
    type: String,
    default: undefined
  },

  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String,
    image: String,
    unitPrice: Number,
    quantity: Number
  }],

  total: {
    type: Number,
    required: true,
    min: 0
  },

  shippingAddress: {
    fullName: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    postcode: { type: String, required: true },
    country: { type: String, required: true }
  },

  status: {
    type: String,
    enum: [
      'Placed',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled'
    ],
    default: 'Placed'
  }
}, { timestamps: true });

// One checkout request can create only one order per user.
orderSchema.index(
  { user: 1, checkoutRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      checkoutRequestId: { $type: 'string' }
    }
  }
);

export default mongoose.model('Order', orderSchema);
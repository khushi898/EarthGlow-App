import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  tokenVersion:{
    type:Number,
    default:0
  },

  // Email verification during login
  loginOtpHash: {
    type: String,
    default: null,
    select: false
  },

  loginOtpExpires: {
    type: Date,
    default: null
  },

  loginOtpAttempts: {
    type: Number,
    default: 0
  },

  loginOtpLastSent: {
    type: Date,
    default: null
  },

  // Forgot password
  resetPasswordTokenHash: {
    type: String,
    default: null,
    select: false
  },

  resetPasswordExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);
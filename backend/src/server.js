import 'dotenv/config';
import mongoose from 'mongoose';

import { createApp } from './app.js';

// Start backend server
const port = process.env.PORT || 5000;

try {
  await mongoose.connect(process.env.MONGO_URI);

  console.log('MongoDB connected');

  createApp().listen(port, () => {
    console.log(
      `Server serving on http://localhost:${port}`
    );
  });
} catch (error) {
  console.error(
    'MongoDB connection failed:',
    error.message
  );

  process.exit(1);
}

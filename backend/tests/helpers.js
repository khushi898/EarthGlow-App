import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach } from 'vitest';

import { createApp } from '../src/app.js';
import Cart from '../src/models/Cart.js';
import Order from '../src/models/Order.js';
import Product from '../src/models/Product.js';
import User from '../src/models/User.js';

// Tests never read .env. Each test file gets its own database on the
// temporary MongoDB started by globalSetup.js, which is deleted afterwards.
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OTP_SECRET = 'test-otp-secret';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.EMAIL_TEST_MODE = 'false';
process.env.EMAIL_TEST_TO = '';

export const PASSWORD = 'password123';
export const ADDRESS = {
  fullName: 'Test Customer',
  line1: '1 Test Street',
  city: 'London',
  postcode: 'E1 1AA',
  country: 'United Kingdom'
};

// A fresh app per test also resets the rate limiters.
export let api;

export function useTestDatabase() {
  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_MONGO_URI, {
      dbName: `earthglow-test-${randomUUID()}`
    });
    await Promise.all([Cart.init(), Order.init(), Product.init(), User.init()]);
  });

  beforeEach(async () => {
    await Promise.all([
      Cart.deleteMany({}),
      Order.deleteMany({}),
      Product.deleteMany({}),
      User.deleteMany({})
    ]);
    process.env.EMAIL_TEST_MODE = 'false';
    process.env.EMAIL_TEST_TO = '';
    api = request(createApp());
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });
}

export async function createUser({
  email = `${randomUUID()}@test.dev`,
  role = 'customer'
} = {}) {
  // Cost 4 keeps tests fast. The real routes use 12.
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  return User.create({ name: 'Test User', email, passwordHash, role });
}

// Creates an account, signs in through the real API and returns a request helper.
export async function signIn(options) {
  const user = await createUser(options);
  const { body } = await api
    .post('/api/auth/login')
    .send({ email: user.email, password: PASSWORD });

  const as = method => path =>
    api[method](path).set('Authorization', `Bearer ${body.token}`);

  return {
    user,
    token: body.token,
    get: as('get'),
    post: as('post'),
    patch: as('patch'),
    delete: as('delete')
  };
}

export function createProduct(overrides = {}) {
  const id = randomUUID();
  return Product.create({
    name: `Product ${id}`,
    slug: id,
    description: 'A test product',
    category: 'Face Care',
    price: 10,
    image: '/images/test.png',
    stock: 10,
    ...overrides
  });
}

export async function stockOf(product) {
  return (await Product.findById(product._id)).stock;
}

// Adds to the bag through the API, then checks out.
export async function placeOrder(customer, product, quantity = 1, extra = {}) {
  await customer
    .post('/api/cart/items')
    .send({ productId: String(product._id), quantity });

  return customer.post('/api/orders').send({
    checkoutRequestId: randomUUID(),
    shippingAddress: ADDRESS,
    items: [{ product: String(product._id), quantity }],
    ...extra
  });
}

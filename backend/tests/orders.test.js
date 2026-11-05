import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  ADDRESS,
  api,
  createProduct,
  placeOrder,
  signIn,
  stockOf,
  useTestDatabase
} from './helpers.js';
import Order from '../src/models/Order.js';
import Product from '../src/models/Product.js';

useTestDatabase();

const orderBody = (product, quantity = 1, overrides = {}) => ({
  checkoutRequestId: randomUUID(),
  shippingAddress: ADDRESS,
  items: [{ product: String(product._id), quantity }],
  ...overrides
});

describe('placing an order', () => {
  it('needs a login', async () => {
    expect((await api.post('/api/orders').send({})).status).toBe(401);
  });

  it('saves the order, lowers stock and empties the bag', async () => {
    const customer = await signIn();
    const product = await createProduct({ stock: 5, price: 19.99 });

    const res = await placeOrder(customer, product, 2);

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('Placed');
    expect(res.body.order.total).toBe(39.98);
    expect(await stockOf(product)).toBe(3);
    expect((await customer.get('/api/cart')).body.cart.items).toHaveLength(0);
  });

  it('uses the server price, ignoring any price the browser sends', async () => {
    const customer = await signIn();
    const product = await createProduct({ price: 19.99 });
    await customer.post('/api/cart/items').send({ productId: String(product._id), quantity: 2 });

    const res = await customer.post('/api/orders').send(
      orderBody(product, 2, {
        total: 0.01,
        items: [{ product: String(product._id), quantity: 2, price: 0.01, unitPrice: 0.01 }]
      })
    );

    expect(res.body.order.total).toBe(39.98);
    expect(res.body.order.items[0].unitPrice).toBe(19.99);
  });

  it('adds prices without floating point errors', async () => {
    const customer = await signIn();
    const product = await createProduct({ price: 0.1, stock: 10 });

    const res = await placeOrder(customer, product, 3);

    expect(res.body.order.total).toBe(0.3);
  });

  it('keeps unselected products and leftover quantities in the bag', async () => {
    const customer = await signIn();
    const bought = await createProduct();
    const kept = await createProduct();
    await customer.post('/api/cart/items').send({ productId: String(kept._id), quantity: 1 });
    await customer.post('/api/cart/items').send({ productId: String(bought._id), quantity: 3 });

    await customer.post('/api/orders').send(orderBody(bought, 1));

    const { items } = (await customer.get('/api/cart')).body.cart;
    expect(items.map(i => [i.product._id, i.quantity])).toEqual([
      [String(kept._id), 1],
      [String(bought._id), 2]
    ]);
  });

  it('refuses a product that is not in the bag', async () => {
    const customer = await signIn();
    const inBag = await createProduct();
    const notInBag = await createProduct();
    await customer.post('/api/cart/items').send({ productId: String(inBag._id), quantity: 1 });

    const res = await customer.post('/api/orders').send(orderBody(notInBag));

    expect(res.status).toBe(400);
    expect(await stockOf(notInBag)).toBe(10);
  });

  it('changes nothing if one product in the order fails', async () => {
    const customer = await signIn();
    const available = await createProduct({ stock: 5 });
    const scarce = await createProduct({ stock: 5 });
    await customer.post('/api/cart/items').send({ productId: String(available._id), quantity: 2 });
    await customer.post('/api/cart/items').send({ productId: String(scarce._id), quantity: 2 });
    await Product.updateOne({ _id: scarce._id }, { stock: 1 });

    const res = await customer.post('/api/orders').send({
      checkoutRequestId: randomUUID(),
      shippingAddress: ADDRESS,
      items: [
        { product: String(available._id), quantity: 2 },
        { product: String(scarce._id), quantity: 2 }
      ]
    });

    expect(res.status).toBe(400);
    expect(await stockOf(available)).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
    expect((await customer.get('/api/cart')).body.cart.items).toHaveLength(2);
  });

  it('never oversells when two customers buy the last items together', async () => {
    const product = await createProduct({ stock: 5 });
    const customers = [await signIn(), await signIn()];
    for (const customer of customers) {
      await customer.post('/api/cart/items').send({ productId: String(product._id), quantity: 4 });
    }

    const results = await Promise.all(
      customers.map(customer => customer.post('/api/orders').send(orderBody(product, 4)))
    );

    expect(results.map(r => r.status).sort()).toEqual([201, 400]);
    expect(await stockOf(product)).toBe(1);
    expect(await Order.countDocuments()).toBe(1);
  });

  it('does not create a second order when a checkout is retried', async () => {
    const customer = await signIn();
    const product = await createProduct({ stock: 5 });
    await customer.post('/api/cart/items').send({ productId: String(product._id), quantity: 2 });
    const body = orderBody(product, 2);

    const first = await customer.post('/api/orders').send(body);
    const retry = await customer.post('/api/orders').send(body);

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body.order._id).toBe(first.body.order._id);
    expect(await stockOf(product)).toBe(3);
  });

  it('creates one order even if the same checkout arrives 3 times at once', async () => {
    const customer = await signIn();
    const product = await createProduct({ stock: 5 });
    await customer.post('/api/cart/items').send({ productId: String(product._id), quantity: 2 });
    const body = orderBody(product, 2);

    await Promise.all([1, 2, 3].map(() => customer.post('/api/orders').send(body)));

    expect(await Order.countDocuments()).toBe(1);
    expect(await stockOf(product)).toBe(3);
  });

  it.each([
    ['a bad checkout ID', { checkoutRequestId: 'nope' }],
    ['an empty order', { items: [] }],
    ['a missing address', { shippingAddress: undefined }],
    ['a blank address field', { shippingAddress: { ...ADDRESS, city: '   ' } }]
  ])('rejects %s', async (_label, overrides) => {
    const customer = await signIn();
    const product = await createProduct();

    const res = await customer.post('/api/orders').send(orderBody(product, 1, overrides));

    expect(res.status).toBe(400);
  });

  it('rejects the same product listed twice', async () => {
    const customer = await signIn();
    const product = await createProduct();
    const item = { product: String(product._id), quantity: 1 };

    const res = await customer.post('/api/orders').send(orderBody(product, 1, { items: [item, item] }));

    expect(res.status).toBe(400);
  });

  it('keeps the name and price paid if the product later changes', async () => {
    const customer = await signIn();
    const product = await createProduct({ name: 'Original', price: 10 });
    await placeOrder(customer, product);

    await Product.updateOne({ _id: product._id }, { name: 'Renamed', price: 99 });

    const [order] = (await customer.get('/api/orders/my')).body.orders;
    expect(order.items[0].name).toBe('Original');
    expect(order.items[0].unitPrice).toBe(10);
  });
});

describe('viewing orders', () => {
  it('shows customers only their own orders', async () => {
    const first = await signIn();
    const second = await signIn();
    await placeOrder(first, await createProduct());

    expect((await first.get('/api/orders/my')).body.orders).toHaveLength(1);
    expect((await second.get('/api/orders/my')).body.orders).toHaveLength(0);
  });

  it('shows all orders to admins only, with no password hashes', async () => {
    const customer = await signIn();
    const admin = await signIn({ role: 'admin' });
    await placeOrder(customer, await createProduct());

    expect((await customer.get('/api/orders')).status).toBe(403);

    const res = await admin.get('/api/orders');
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].user.email).toBe(customer.user.email);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
});

describe('changing order status', () => {
  async function setup(stock = 5, quantity = 2) {
    const admin = await signIn({ role: 'admin' });
    const customer = await signIn();
    const product = await createProduct({ stock });
    const { body } = await placeOrder(customer, product, quantity);
    const setStatus = status =>
      admin.patch(`/api/orders/${body.order._id}/status`).send({ status });
    return { admin, customer, product, order: body.order, setStatus };
  }

  it('moves through the normal steps', async () => {
    const { setStatus } = await setup();

    for (const status of ['Processing', 'Shipped', 'Delivered']) {
      const res = await setStatus(status);
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe(status);
    }
  });

  it.each([
    ['Placed', 'Delivered', []],
    ['Placed', 'Shipped', []],
    ['Shipped', 'Processing', ['Processing', 'Shipped']],
    ['Shipped', 'Cancelled', ['Processing', 'Shipped']],
    ['Delivered', 'Cancelled', ['Processing', 'Shipped', 'Delivered']],
    ['Cancelled', 'Delivered', ['Cancelled']]
  ])('refuses %s to %s', async (_from, to, steps) => {
    const { setStatus } = await setup();
    for (const step of steps) await setStatus(step);

    expect((await setStatus(to)).status).toBe(409);
  });

  it('returns stock when an order is cancelled', async () => {
    const { product, setStatus } = await setup();
    expect(await stockOf(product)).toBe(3);

    await setStatus('Cancelled');

    expect(await stockOf(product)).toBe(5);
  });

  it('returns stock only once if cancel arrives 3 times at once', async () => {
    const { product, setStatus } = await setup();

    await Promise.all([1, 2, 3].map(() => setStatus('Cancelled')));

    expect(await stockOf(product)).toBe(5);
  });

  it('can still cancel after the product was deleted', async () => {
    const { product, setStatus } = await setup();
    await Product.deleteOne({ _id: product._id });

    expect((await setStatus('Cancelled')).status).toBe(200);
  });

  it('is refused for customers and leaves the order unchanged', async () => {
    const { customer, order } = await setup();

    const res = await customer.patch(`/api/orders/${order._id}/status`).send({ status: 'Delivered' });

    expect(res.status).toBe(403);
    expect((await Order.findById(order._id)).status).toBe('Placed');
  });

  it('handles a bad status, a bad ID and a missing order', async () => {
    const { admin, setStatus } = await setup();

    expect((await setStatus('constructor')).status).toBe(400);
    expect((await admin.patch('/api/orders/not-an-id/status').send({ status: 'Shipped' })).status).toBe(400);
    expect((await admin.patch(`/api/orders/${'a'.repeat(24)}/status`).send({ status: 'Shipped' })).status).toBe(404);
  });
});

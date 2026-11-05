import { describe, expect, it } from 'vitest';

import {
  api,
  createProduct,
  signIn,
  useTestDatabase
} from './helpers.js';

useTestDatabase();

const add = (customer, product, quantity) =>
  customer
    .post('/api/cart/items')
    .send({ productId: String(product._id), quantity });

describe('shopping bag', () => {
  it('needs a login', async () => {
    expect((await api.get('/api/cart')).status).toBe(401);
  });

  it('adds products, and adding again increases the quantity', async () => {
    const customer = await signIn();
    const product = await createProduct();

    await add(customer, product, 2);
    const res = await add(customer, product, 3);

    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].quantity).toBe(5);
    expect(res.body.cart.items[0].product.name).toBe(product.name);
  });

  it('keeps each customer\'s bag separate', async () => {
    const first = await signIn();
    const second = await signIn();

    await add(first, await createProduct(), 1);

    expect((await second.get('/api/cart')).body.cart.items).toHaveLength(0);
  });

  it('changes a quantity and removes an item', async () => {
    const customer = await signIn();
    const product = await createProduct();
    await add(customer, product, 1);

    const changed = await customer.patch(`/api/cart/items/${product._id}`).send({ quantity: 4 });
    expect(changed.body.cart.items[0].quantity).toBe(4);

    const removed = await customer.delete(`/api/cart/items/${product._id}`);
    expect(removed.body.cart.items).toHaveLength(0);
  });

  it('refuses more than the available stock', async () => {
    const customer = await signIn();
    const product = await createProduct({ stock: 3 });

    expect((await add(customer, product, 4)).status).toBe(400);

    await add(customer, product, 3);
    expect((await add(customer, product, 1)).status).toBe(400);
    expect((await customer.patch(`/api/cart/items/${product._id}`).send({ quantity: 4 })).status).toBe(400);
  });

  it('caps each product at the 100 that checkout accepts', async () => {
    const customer = await signIn();
    const product = await createProduct({ stock: 500 });

    expect((await add(customer, product, 101)).status).toBe(400);
    expect((await add(customer, product, 100)).status).toBe(200);
    expect((await add(customer, product, 1)).status).toBe(400);
    expect((await customer.patch(`/api/cart/items/${product._id}`).send({ quantity: 101 })).status).toBe(400);
  });

  it.each([0, -1, 1.5, 'lots'])('rejects a quantity of %s', async quantity => {
    const customer = await signIn();

    expect((await add(customer, await createProduct(), quantity)).status).toBe(400);
  });

  it('returns 400 for a bad product ID and 404 for a missing product', async () => {
    const customer = await signIn();

    const bad = await customer.post('/api/cart/items').send({ productId: 'not-an-id' });
    const missing = await customer.post('/api/cart/items').send({ productId: 'a'.repeat(24) });

    expect(bad.status).toBe(400);
    expect(missing.status).toBe(404);
  });
});

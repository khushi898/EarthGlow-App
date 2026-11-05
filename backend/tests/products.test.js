import { describe, expect, it, vi } from 'vitest';

import {
  api,
  createProduct,
  signIn,
  stockOf,
  useTestDatabase
} from './helpers.js';

useTestDatabase();

const newProduct = {
  name: 'New Cream',
  slug: 'new-cream',
  description: 'A new cream',
  category: 'Face Care',
  price: 12.5,
  image: '/images/new.png',
  stock: 5
};

describe('browsing products', () => {
  it('filters by category', async () => {
    await createProduct({ category: 'Face Care' });
    await createProduct({ category: 'Hair Care' });

    const res = await api.get('/api/products?category=Hair%20Care');

    expect(res.body.total).toBe(1);
    expect(res.body.products[0].category).toBe('Hair Care');
  });

  it('splits results into pages and caps the page size at 48', async () => {
    await Promise.all(Array.from({ length: 50 }, () => createProduct()));

    const res = await api.get('/api/products?limit=100');

    expect(res.body.products).toHaveLength(48);
    expect(res.body.total).toBe(50);
    expect(res.body.pages).toBe(2);
  });

  it('lists only the categories that have products', async () => {
    await createProduct({ category: 'Serums' });

    const res = await api.get('/api/categories');

    expect(res.body.categories).toEqual(['Serums']);
  });

  it('searches names and descriptions, ignoring case', async () => {
    await createProduct({ name: 'Rose Cream' });
    await createProduct({ description: 'Smells of ROSE' });
    await createProduct({ name: 'Plain Soap' });

    const res = await api.get('/api/products?search=rose');

    expect(res.body.total).toBe(2);
  });

  it('treats search text as plain text, not a regular expression', async () => {
    await createProduct({ name: 'Cream (Large)' });
    await createProduct({ name: 'Plain Soap' });

    const brackets = await api.get(`/api/products?search=${encodeURIComponent('(large)')}`);
    const broken = await api.get('/api/products?search=(');
    const wildcard = await api.get(`/api/products?search=${encodeURIComponent('.*')}`);

    expect(brackets.body.total).toBe(1);
    expect(broken.status).toBe(200);
    expect(wildcard.body.total).toBe(0);
  });

  it('ignores database operators in the category filter', async () => {
    await createProduct({ category: 'Face Care' });
    await createProduct({ category: 'Hair Care' });

    // If the operator reached the database, this would hide Face Care.
    const res = await api.get(`/api/products?category[$ne]=${encodeURIComponent('Face Care')}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  it('returns 400 for a bad product ID without leaking internals', async () => {
    const res = await api.get('/api/products/not-an-id');

    expect(res.status).toBe(400);
    expect(res.body.message).not.toMatch(/ObjectId|Cast to/);
  });

  it('returns 404 for a product that does not exist', async () => {
    const res = await api.get(`/api/products/${'a'.repeat(24)}`);

    expect(res.status).toBe(404);
  });
});

describe('managing products', () => {
  it('lets an admin create, edit and delete a product', async () => {
    const admin = await signIn({ role: 'admin' });

    const created = await admin.post('/api/products').send(newProduct);
    expect(created.status).toBe(201);

    const id = created.body.product._id;
    const edited = await admin.patch(`/api/products/${id}`).send({ price: 15 });
    expect(edited.body.product.price).toBe(15);

    expect((await admin.delete(`/api/products/${id}`)).status).toBe(200);
    expect((await api.get(`/api/products/${id}`)).status).toBe(404);
  });

  it('rejects an invalid product', async () => {
    const admin = await signIn({ role: 'admin' });

    const res = await admin.post('/api/products').send({ ...newProduct, price: -1 });

    expect(res.status).toBe(400);
  });

  it('accepts an uploaded image far larger than other requests allow', async () => {
    const admin = await signIn({ role: 'admin' });

    const res = await admin
      .post('/api/products')
      .send({ ...newProduct, image: `data:image/png;base64,${'a'.repeat(1_000_000)}` });

    expect(res.status).toBe(201);
  });

  describe.each([
    ['create', () => ['post', '/api/products']],
    ['edit', id => ['patch', `/api/products/${id}`]],
    ['restock', id => ['post', `/api/products/${id}/restock`]],
    ['delete', id => ['delete', `/api/products/${id}`]]
  ])('%s', (_name, route) => {
    it('needs a login', async () => {
      const product = await createProduct();
      const [method, path] = route(product._id);

      expect((await api[method](path).send({ quantity: 1 })).status).toBe(401);
    });

    it('is refused for customers', async () => {
      const product = await createProduct();
      const customer = await signIn();
      const [method, path] = route(product._id);

      expect((await customer[method](path).send({ quantity: 1 })).status).toBe(403);
      expect(await stockOf(product)).toBe(10);
    });
  });
});

describe('restocking', () => {
  it('counts every restock when several happen at once', async () => {
    const admin = await signIn({ role: 'admin' });
    const product = await createProduct({ stock: 5 });

    await Promise.all(
      [1, 2, 3, 4].map(() =>
        admin.post(`/api/products/${product._id}/restock`).send({ quantity: 10 })
      )
    );

    expect(await stockOf(product)).toBe(45);
  });

  it.each([1.5, 0, -5, '5', 10001])('rejects a quantity of %s', async quantity => {
    const admin = await signIn({ role: 'admin' });
    const product = await createProduct({ stock: 5 });

    const res = await admin.post(`/api/products/${product._id}/restock`).send({ quantity });

    expect(res.status).toBe(400);
    expect(await stockOf(product)).toBe(5);
  });
});

describe('request size limits', () => {
  it('rejects an oversized body on other routes without leaking internals', async () => {
    const res = await api
      .post('/api/auth/forgot-password')
      .send({ email: 'x'.repeat(200000) });

    expect(res.status).toBe(413);
  });
});

describe('unexpected errors', () => {
  it('hides internal details behind a 500', async () => {
    const { default: Product } = await import('../src/models/Product.js');
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    const failure = vi
      .spyOn(Product, 'distinct')
      .mockRejectedValueOnce(new Error('secret database detail'));

    const res = await api.get('/api/categories');
    failure.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
  });
});

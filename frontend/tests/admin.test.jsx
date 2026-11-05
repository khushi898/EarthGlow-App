import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ADMIN, mockApi, product, renderApp, signInAs } from './testUtils.jsx';

const order = {
  _id: 'order1',
  status: 'Placed',
  total: 30,
  createdAt: '2026-11-05T10:00:00.000Z',
  user: { name: 'Asha Patel', email: 'asha@test.dev' },
  items: [{ product: 'p1', name: 'Rose Cream', unitPrice: 10, quantity: 3 }]
};

function adminRoutes(products = [product()], orders = [order]) {
  return {
    'GET /categories': { categories: ['Face Care'] },
    'GET /cart': { cart: { items: [] } },
    'GET /products': { products, page: 1, pages: 1, total: products.length },
    'GET /orders': { orders }
  };
}

async function openDashboard(routes) {
  const calls = mockApi(routes);
  signInAs(ADMIN);
  renderApp('/admin');
  await screen.findByText('Admin Dashboard');
  return { calls, user: userEvent.setup() };
}

const productCard = name => screen.findByText(name, { selector: '.admin-product-name' })
  .then(element => within(element.closest('.admin-product-card')));

describe('editing a product', () => {
  it('keeps the existing image gallery', async () => {
    const images = ['/images/a.png', '/images/b.png'];
    const { calls, user } = await openDashboard({
      ...adminRoutes([product({ images })]),
      'PATCH /products/p1': { product: product() }
    });

    await user.click((await productCard('Rose Cream')).getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Update Product' }));

    await waitFor(() => expect(calls.some(call => call.method === 'PATCH')).toBe(true));
    expect(calls.find(call => call.method === 'PATCH').body.images).toEqual(images);
  });

  it('shows a stock of 0 instead of an empty field', async () => {
    const { user } = await openDashboard(adminRoutes([product({ stock: 0 })]));

    await user.click((await productCard('Rose Cream')).getByRole('button', { name: 'Edit' }));

    expect(screen.getByPlaceholderText('Stock Quantity')).toHaveValue(0);
  });

  it('clears the form when the edit is cancelled', async () => {
    const { user } = await openDashboard(adminRoutes());

    await user.click((await productCard('Rose Cream')).getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Cancel Edit' }));

    expect(screen.getByPlaceholderText('Product name')).toHaveValue('');
    expect(screen.getByPlaceholderText('Stock Quantity')).toHaveValue(null);
  });
});

describe('adding products', () => {
  function formCategorySelect() {
    return screen.getByRole('option', { name: 'Select category' }).closest('select');
  }

  it('saves each product with its own stock and a real category', async () => {
    const { calls, user } = await openDashboard({
      ...adminRoutes(),
      'POST /products': { product: product() }
    });

    for (const [name, stock] of [['First', '7'], ['Second', '8']]) {
      await user.type(screen.getByPlaceholderText('Product name'), name);
      await user.type(screen.getByPlaceholderText('Price'), '5');
      await user.selectOptions(formCategorySelect(), 'Body Care');
      await user.type(screen.getByPlaceholderText('Stock Quantity'), stock);
      await user.type(screen.getByPlaceholderText('Product description'), 'New');
      await user.type(screen.getByPlaceholderText('https://example.com/product.jpg'), '/x.png');
      await user.click(screen.getByRole('button', { name: 'Add Product' }));
      await waitFor(() => expect(screen.getByPlaceholderText('Product name')).toHaveValue(''));
    }

    const saved = calls.filter(call => call.method === 'POST' && call.url === '/products');
    expect(saved.map(call => [call.body.name, call.body.stock, call.body.category])).toEqual([
      ['First', 7, 'Body Care'],
      ['Second', 8, 'Body Care']
    ]);
    expect(screen.getByPlaceholderText('Stock Quantity')).toHaveValue(null);
  });

  it('only offers categories that match the shop', async () => {
    await openDashboard(adminRoutes());

    const options = within(formCategorySelect())
      .getAllByRole('option')
      .map(option => option.value)
      .filter(Boolean);

    expect(options).toEqual(['Face Care', 'Hair Care', 'Body Care', 'Baby Care', 'Moisturisers', 'Serums']);
  });
});

describe('product list', () => {
  it('loads every page of products', async () => {
    const pageOne = Array.from({ length: 48 }, (_, i) => product({ _id: `a${i}`, name: `Product ${i}` }));
    const pageTwo = [product({ _id: 'last', name: 'Last Product' })];

    await openDashboard({
      ...adminRoutes(),
      'GET /products': ({ params }) => ({
        products: params.page === 1 ? pageOne : pageTwo,
        page: params.page,
        pages: 2,
        total: 49
      })
    });

    expect(await screen.findByText('Last Product')).toBeInTheDocument();
    expect(document.querySelectorAll('.admin-product-card')).toHaveLength(49);
  });
});

describe('restocking', () => {
  it('sends the amount to add, not a new total', async () => {
    const { calls, user } = await openDashboard({
      ...adminRoutes(),
      'POST /products/p1/restock': { product: product({ stock: 9 }) }
    });
    prompt.mockReturnValue('4');

    await user.click((await productCard('Rose Cream')).getByRole('button', { name: 'Restock' }));

    await waitFor(() => expect(calls.some(call => call.url === '/products/p1/restock')).toBe(true));
    expect(calls.find(call => call.url === '/products/p1/restock').body).toEqual({ quantity: 4 });
  });

  it.each(['abc', '1.5', '0', '-2'])('refuses an amount of %s', async amount => {
    const { calls, user } = await openDashboard(adminRoutes());
    prompt.mockReturnValue(amount);

    await user.click((await productCard('Rose Cream')).getByRole('button', { name: 'Restock' }));

    expect(alert).toHaveBeenCalled();
    expect(calls.some(call => call.url === '/products/p1/restock')).toBe(false);
  });

  it('does nothing if the prompt is cancelled', async () => {
    const { calls, user } = await openDashboard(adminRoutes());
    prompt.mockReturnValue(null);

    await user.click((await productCard('Rose Cream')).getByRole('button', { name: 'Restock' }));

    expect(alert).not.toHaveBeenCalled();
    expect(calls.some(call => call.url === '/products/p1/restock')).toBe(false);
  });
});

describe('customer orders', () => {
  const orderCard = async () => {
    const number = await screen.findByText('order1', { exact: false });
    return number.closest('.admin-order-card');
  };

  it('shows the real quantity of each item', async () => {
    await openDashboard(adminRoutes());

    const card = await orderCard();

    expect(card).toHaveTextContent('Rose Cream × 3');
    expect(card).toHaveTextContent('Items: 3');
  });

  it.each([
    ['Placed', ['Placed', 'Processing', 'Cancelled']],
    ['Processing', ['Processing', 'Shipped', 'Cancelled']],
    ['Shipped', ['Shipped', 'Delivered']]
  ])('offers only the valid next steps from %s', async (status, expected) => {
    await openDashboard(adminRoutes([product()], [{ ...order, status }]));

    const select = within(await orderCard()).getByRole('combobox');

    expect(within(select).getAllByRole('option').map(option => option.value)).toEqual(expected);
    expect(select).toBeEnabled();
  });

  it.each(['Delivered', 'Cancelled'])('locks an order that is %s', async status => {
    await openDashboard(adminRoutes([product()], [{ ...order, status }]));

    expect(within(await orderCard()).getByRole('combobox')).toBeDisabled();
  });

  it('sends a status change to the server', async () => {
    const { calls, user } = await openDashboard({
      ...adminRoutes(),
      'PATCH /orders/order1/status': { order: { ...order, status: 'Cancelled' } }
    });

    await user.selectOptions(within(await orderCard()).getByRole('combobox'), 'Cancelled');

    await waitFor(() => expect(calls.some(call => call.method === 'PATCH')).toBe(true));
    expect(calls.find(call => call.method === 'PATCH').body).toEqual({ status: 'Cancelled' });
  });
});

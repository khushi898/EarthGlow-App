import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CUSTOMER, emptyList, mockApi, product, renderApp, signInAs } from './testUtils.jsx';

const baseRoutes = {
  'GET /categories': { categories: ['Face Care'] },
  'GET /cart': { cart: { items: [] } },
  'GET /products': emptyList
};

const cartWith = (...items) => ({ cart: { items } });
const namesOnPage = () =>
  [...document.querySelectorAll('.product-name')].map(element => element.textContent);

describe('product list', () => {
  it('shows the total number of products, not just those loaded', async () => {
    mockApi({
      ...baseRoutes,
      'GET /products': { products: [product()], page: 1, pages: 3, total: 35 }
    });

    renderApp();

    expect(await screen.findByText('35 products')).toBeInTheDocument();
  });

  it('adds the next page below the current products', async () => {
    mockApi({
      ...baseRoutes,
      'GET /products': ({ params }) => ({
        products: [product({ _id: `p${params.page}`, name: `Product ${params.page}` })],
        page: params.page,
        pages: 2,
        total: 2
      })
    });
    const user = userEvent.setup();

    renderApp();
    await user.click(await screen.findByRole('button', { name: 'Load More Products' }));

    await screen.findByText('Product 2');
    expect(namesOnPage()).toEqual(['Product 1', 'Product 2']);
    expect(screen.queryByRole('button', { name: 'Load More Products' })).not.toBeInTheDocument();
  });

  it('ignores a slow old response after a new search', async () => {
    let finishOldRequest;
    mockApi({
      ...baseRoutes,
      'GET /products': ({ params }) => {
        if (params.search === 'new') {
          return { products: [product({ name: 'New Result' })], page: 1, pages: 1, total: 1 };
        }
        return new Promise(resolve => {
          finishOldRequest = () =>
            resolve({ products: [product({ name: 'Old Result' })], page: 1, pages: 1, total: 1 });
        });
      }
    });
    const user = userEvent.setup();

    renderApp();
    await user.type(screen.getByLabelText('Search products'), 'new{Enter}');
    await screen.findByText('New Result');

    finishOldRequest();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(namesOnPage()).toEqual(['New Result']);
  });

  it('shows a friendly message when products cannot load', async () => {
    mockApi({ ...baseRoutes, 'GET /products': { status: 500, data: {} } });

    renderApp();

    const message = await screen.findByText(/Could not load products/);
    expect(message).not.toHaveTextContent('MongoDB');
  });

  it('marks a product with no stock and disables its button', async () => {
    mockApi({
      ...baseRoutes,
      'GET /products': { products: [product({ stock: 0 })], page: 1, pages: 1, total: 1 }
    });

    renderApp();

    expect(await screen.findByRole('button', { name: 'Out of stock' })).toBeDisabled();
  });
});

describe('adding to the bag', () => {
  it('sends a logged-out shopper to sign in', async () => {
    mockApi({
      ...baseRoutes,
      'GET /products': { products: [product()], page: 1, pages: 1, total: 1 }
    });
    const user = userEvent.setup();

    renderApp();
    await user.click(await screen.findByRole('button', { name: 'Add to bag' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('shows a message that disappears by itself', async () => {
    mockApi({
      ...baseRoutes,
      'GET /products': { products: [product()], page: 1, pages: 1, total: 1 },
      'POST /cart/items': cartWith()
    });
    signInAs(CUSTOMER);
    const user = userEvent.setup();

    renderApp();
    await user.click(await screen.findByRole('button', { name: 'Add to bag' }));

    expect(await screen.findByText('Rose Cream added to your bag')).toBeInTheDocument();
    await waitFor(
      () => expect(screen.queryByText('Rose Cream added to your bag')).not.toBeInTheDocument(),
      { timeout: 4000 }
    );
  });
});

describe('demo notices', () => {
  it('describes a product page as a demo in professional wording', async () => {
    mockApi({ ...baseRoutes, 'GET /products/p1': { product: product() } });

    renderApp('/products/p1');

    expect(await screen.findByText(/^Demo product\./)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/learning project/i);
  });

  it('says checkout collects no payment, in professional wording', async () => {
    mockApi({
      ...baseRoutes,
      'GET /cart': cartWith({ product: product(), quantity: 1 })
    });
    signInAs(CUSTOMER);
    const user = userEvent.setup();

    renderApp('/cart');
    await user.click(await screen.findByRole('checkbox', { name: 'Select Rose Cream' }));
    await user.click(screen.getByRole('button', { name: 'Continue to checkout' }));

    expect(await screen.findByText(/This is a demo checkout/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/educational/i);
  });
});

describe('bag and checkout', () => {
  const bagRoutes = {
    ...baseRoutes,
    'GET /cart': cartWith(
      { product: product(), quantity: 2 },
      { product: product({ _id: 'p2', name: 'Plain Soap', price: 4 }), quantity: 1 }
    )
  };
  const summary = () => within(document.querySelector('.summary'));

  it('totals only the ticked products and shows demo delivery', async () => {
    mockApi(bagRoutes);
    signInAs(CUSTOMER);
    const user = userEvent.setup();

    renderApp('/cart');
    const checkbox = await screen.findByRole('checkbox', { name: 'Select Rose Cream' });
    expect(summary().getByRole('button', { name: 'Continue to checkout' })).toBeDisabled();

    await user.click(checkbox);

    expect(summary().getByText('£20.00')).toBeInTheDocument();
    expect(summary().getByText('Free (demo)')).toBeInTheDocument();
  });

  it('keeps working when removing an item fails', async () => {
    mockApi({
      ...bagRoutes,
      'DELETE /cart/items/p1': { status: 500, data: { message: 'Could not remove that' } }
    });
    signInAs(CUSTOMER);
    const user = userEvent.setup();

    renderApp('/cart');
    await screen.findByRole('checkbox', { name: 'Select Rose Cream' });
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    expect(await screen.findByText('Could not remove that')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Rose Cream' })).toBeInTheDocument();
  });

  it('orders only the ticked products and never sends a price', async () => {
    const calls = mockApi({
      ...bagRoutes,
      'POST /orders': ({ body }) => ({ status: 201, data: { order: { _id: 'abcdefghij1234567', ...body } } })
    });
    signInAs(CUSTOMER);
    const user = userEvent.setup();

    renderApp('/cart');
    await user.click(await screen.findByRole('checkbox', { name: 'Select Rose Cream' }));
    await user.click(screen.getByRole('button', { name: 'Continue to checkout' }));

    await user.type(await screen.findByLabelText('Address line'), '1 Test Street');
    await user.type(screen.getByLabelText('Town / city'), 'London');
    await user.type(screen.getByLabelText('Postcode'), 'E1 1AA');
    await user.click(screen.getByRole('button', { name: 'Place demo order' }));

    expect(await screen.findByText('Thank you for your order!')).toBeInTheDocument();

    const { body } = calls.find(call => call.url === '/orders');
    expect(body.items).toEqual([{ product: 'p1', quantity: 2 }]);
    expect(body.checkoutRequestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(body.shippingAddress.city).toBe('London');
    expect(JSON.stringify(body)).not.toMatch(/price|total/i);
  });

  it('stays on checkout and shows the reason when an order fails', async () => {
    mockApi({
      ...bagRoutes,
      'POST /orders': { status: 400, data: { message: 'Not enough stock for Rose Cream.' } }
    });
    signInAs(CUSTOMER);
    const user = userEvent.setup();

    renderApp('/cart');
    await user.click(await screen.findByRole('checkbox', { name: 'Select Rose Cream' }));
    await user.click(screen.getByRole('button', { name: 'Continue to checkout' }));
    await user.type(await screen.findByLabelText('Address line'), '1 Test Street');
    await user.type(screen.getByLabelText('Town / city'), 'London');
    await user.type(screen.getByLabelText('Postcode'), 'E1 1AA');
    await user.click(screen.getByRole('button', { name: 'Place demo order' }));

    expect(await screen.findByText('Not enough stock for Rose Cream.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Place demo order' })).toBeEnabled();
  });
});

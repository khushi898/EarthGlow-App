import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ADMIN, CUSTOMER, emptyList, mockApi, renderApp, signInAs } from './testUtils.jsx';

const siteRoutes = {
  'GET /categories': { categories: ['Face Care', 'Serums'] },
  'GET /products': emptyList,
  'GET /cart': { cart: { items: [] } },
  'GET /orders': { orders: [] }
};

describe('admin access', () => {
  it('shows the Admin link only to admins', async () => {
    mockApi(siteRoutes);
    signInAs(ADMIN);

    renderApp();

    expect(await screen.findByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('hides the Admin link from customers', async () => {
    mockApi(siteRoutes);
    signInAs(CUSTOMER);

    renderApp();

    await screen.findByText('Hi, Asha');
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('sends a logged-out visitor from /admin to the login page', async () => {
    mockApi(siteRoutes);

    renderApp('/admin');

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('blocks a customer from /admin without requesting admin data', async () => {
    const calls = mockApi(siteRoutes);
    signInAs(CUSTOMER);

    renderApp('/admin');

    expect(await screen.findByText('Admin access required')).toBeInTheDocument();
    expect(calls.some(call => call.url === '/orders')).toBe(false);
  });

  it('opens the dashboard for an admin', async () => {
    mockApi(siteRoutes);
    signInAs(ADMIN);

    renderApp('/admin');

    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument();
  });
});

describe('expired sessions', () => {
  it('signs out when the saved token is rejected on page load', async () => {
    mockApi({ ...siteRoutes, 'GET /cart': { status: 401, data: { message: 'Invalid or expired token' } } });
    signInAs(CUSTOMER, 'expired-token');

    renderApp();

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('Hi, Asha')).not.toBeInTheDocument();
    expect(localStorage.getItem('earthglow_token')).toBeNull();
    expect(localStorage.getItem('earthglow_user')).toBeNull();
  });

  it('stays signed in when a request fails for another reason', async () => {
    let cartRequests = 0;
    mockApi({
      ...siteRoutes,
      'GET /cart': () => {
        cartRequests += 1;
        return { status: 500, data: { message: 'Internal server error' } };
      }
    });
    signInAs(CUSTOMER);

    renderApp();

    await waitFor(() => expect(cartRequests).toBeGreaterThan(0));
    expect(screen.getByText('Hi, Asha')).toBeInTheDocument();
    expect(localStorage.getItem('earthglow_token')).toBe('valid-token');
  });

  it('does not end a valid session when a sign-in attempt fails', async () => {
    mockApi({
      ...siteRoutes,
      'POST /auth/login': { status: 401, data: { message: 'Invalid email or password' } }
    });
    signInAs(CUSTOMER);
    const user = userEvent.setup();

    renderApp('/login');
    await user.type(screen.getByLabelText('Email address'), 'asha@test.dev');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByText('Hi, Asha')).toBeInTheDocument();
  });
});

describe('signing in', () => {
  it('saves the session and greets the customer', async () => {
    mockApi({
      ...siteRoutes,
      'POST /auth/login': { token: 'new-token', user: CUSTOMER }
    });
    const user = userEvent.setup();

    renderApp('/login');
    await user.type(screen.getByLabelText('Email address'), 'asha@test.dev');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Hi, Asha')).toBeInTheDocument();
    expect(localStorage.getItem('earthglow_token')).toBe('new-token');
  });

  it('asks for the emailed code when the account needs one', async () => {
    const calls = mockApi({
      ...siteRoutes,
      'POST /auth/login': { requiresVerification: true },
      'POST /auth/verify-login': { token: 'new-token', user: ADMIN }
    });
    const user = userEvent.setup();

    renderApp('/login');
    await user.type(screen.getByLabelText('Email address'), 'admin@test.dev');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await user.type(await screen.findByLabelText('4-digit verification code'), '1234');
    await user.click(screen.getByRole('button', { name: 'Verify & Sign in' }));

    expect(await screen.findByRole('link', { name: 'Admin' })).toBeInTheDocument();
    expect(calls.find(call => call.url === '/auth/verify-login').body).toEqual({
      email: 'admin@test.dev',
      code: '1234'
    });
  });
});

describe('site footer', () => {
  it('describes the demo professionally, with no made-up contact details', async () => {
    mockApi(siteRoutes);

    renderApp();

    const footer = document.querySelector('.footer');
    expect(footer).toHaveTextContent('A demo e-commerce project');
    expect(footer).not.toHaveTextContent(/student|mamaearth|\.example/i);
    expect(within(footer).getByRole('link', { name: 'View source on GitHub' }))
      .toHaveAttribute('href', 'https://github.com/khushi898/EarthGlow-App');
  });
});

describe('site header', () => {
  it('builds the menu from the real categories', async () => {
    mockApi(siteRoutes);

    renderApp();

    const menu = within(document.querySelector('.category-nav'));
    expect(await menu.findByRole('link', { name: 'Serums' })).toHaveAttribute('href', '/?category=Serums');
    expect(menu.queryByRole('link', { name: 'Baby' })).not.toBeInTheDocument();
  });

  it('does not promise free delivery', async () => {
    mockApi(siteRoutes);

    renderApp();

    expect(document.querySelector('.announcement')).toHaveTextContent('Demo store');
    expect(document.body).not.toHaveTextContent('Free delivery');
  });
});

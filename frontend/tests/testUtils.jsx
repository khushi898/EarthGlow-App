import { render } from '@testing-library/react';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';

import api from '../src/api/client.js';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';

export const CUSTOMER = { id: 'c1', name: 'Asha Patel', email: 'asha@test.dev', role: 'customer' };
export const ADMIN = { id: 'a1', name: 'Admin User', email: 'admin@test.dev', role: 'admin' };

export function signInAs(user, token = 'valid-token') {
  localStorage.setItem('earthglow_token', token);
  localStorage.setItem('earthglow_user', JSON.stringify(user));
}

export function product(overrides = {}) {
  return {
    _id: 'p1',
    name: 'Rose Cream',
    category: 'Face Care',
    price: 10,
    stock: 5,
    description: 'A cream',
    image: '/images/rose.png',
    images: [],
    ...overrides
  };
}

export const emptyList = { products: [], page: 1, pages: 1, total: 0 };

// Answers requests with the real API client, so its interceptors still run.
// A route is 'METHOD /path', and its answer is data, { status, data } or a function.
export function mockApi(routes) {
  const calls = [];

  api.defaults.adapter = async config => {
    const method = config.method.toUpperCase();
    const call = {
      method,
      url: config.url,
      params: config.params,
      body: config.data ? JSON.parse(config.data) : undefined
    };
    calls.push(call);

    const route = routes[`${method} ${config.url}`];
    if (route === undefined) throw new Error(`Unexpected request: ${method} ${config.url}`);

    const answer = typeof route === 'function' ? await route(call) : route;
    const hasStatus = answer && typeof answer.status === 'number';
    const status = hasStatus ? answer.status : 200;
    const response = {
      data: hasStatus ? answer.data : answer,
      status,
      statusText: '',
      headers: {},
      config
    };

    if (status >= 400) {
      throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response);
    }

    return response;
  };

  return calls;
}

export function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

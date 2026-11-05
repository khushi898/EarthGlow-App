import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('earthglow_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let onSessionExpired = () => {};

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// Registered here, not in a React effect, so it also covers
// requests that start during the very first render.
api.interceptors.response.use(
  response => response,
  error => {
    const token = localStorage.getItem('earthglow_token');

    const sentCurrentToken =
      token &&
      error.config?.headers?.Authorization === `Bearer ${token}`;

    // On /auth routes a 401 means wrong credentials, not an expired session.
    if (
      error.response?.status === 401 &&
      sentCurrentToken &&
      !error.config.url.startsWith('/auth/')
    ) {
      onSessionExpired();
    }

    return Promise.reject(error);
  }
);

export default api;

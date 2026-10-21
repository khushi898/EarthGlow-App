import React, {
  createContext,
  useContext,
  useState
} from 'react';

import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('earthglow_user')
      );
    } catch {
      return null;
    }
  });

  function saveSession(data) {
    if (!data.token || !data.user) {
      throw new Error('Invalid login response');
    }

    localStorage.setItem(
      'earthglow_token',
      data.token
    );

    localStorage.setItem(
      'earthglow_user',
      JSON.stringify(data.user)
    );

    setUser(data.user);

    return data.user;
  }

  // Step 1: Check password and request email code
async function login(email, password) {
  const { data } = await api.post('/auth/login', {
    email,
    password
  });

  // Test account: email verification required
  if (data.requiresVerification) {
    return data;
  }

  // Other customers: normal login
  if (data.token && data.user) {
    saveSession(data);
    return data;
  }

  throw new Error('Unexpected login response.');
}

  // Step 2: Verify code and complete login
  async function verifyLogin(email, code) {
    const { data } = await api.post(
      '/auth/verify-login',
      { email, code }
    );

    return saveSession(data);
  }

  // Register without automatically logging in
  async function register(name, email, password) {
    const { data } = await api.post(
      '/auth/register',
      { name, email, password }
    );

    return data;
  }

  // Request password-reset email
  async function forgotPassword(email) {
    const { data } = await api.post(
      '/auth/forgot-password',
      { email }
    );

    return data;
  }

  // Set a new password using the emailed token
  async function resetPassword(token, password) {
    const { data } = await api.post(
      '/auth/reset-password',
      { token, password }
    );

    return data;
  }

  function logout() {
    localStorage.removeItem('earthglow_token');
    localStorage.removeItem('earthglow_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        verifyLogin,
        register,
        forgotPassword,
        resetPassword,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
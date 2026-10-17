import React, { createContext, useContext, useState } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('earthglow_user')); } catch { return null; }
  });

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('earthglow_token', data.token);
    localStorage.setItem('earthglow_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }
  async function register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('earthglow_token', data.token);
    localStorage.setItem('earthglow_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }
  function logout() {
    localStorage.removeItem('earthglow_token');
    localStorage.removeItem('earthglow_user');
    setUser(null);
  }
  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }

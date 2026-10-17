import React, { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import api from './api/client.js';
import Admin from './pages/Admin.jsx';

import { useAuth } from './context/AuthContext.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import OrderSuccess from './pages/OrderSuccess.jsx';

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [toast, setToast] = useState('');

  const refreshCart = useCallback(async () => {
    if (!localStorage.getItem('earthglow_token')) { setCartItems([]); return; }
    try {
      const { data } = await api.get('/cart');
      setCartItems(data.cart.items.filter(i => i.product).map(i => ({ product: i.product, quantity: i.quantity })));
    } catch { setCartItems([]); }
  }, []);

  useEffect(() => { refreshCart(); }, [refreshCart, user]);

  async function addToCart(product,quantity=1) {
    if (!user) { navigate('/login'); return; }
    try {
      await api.post('/cart/items', { productId: product._id, quantity});
      await refreshCart();
      setToast(`${product.name} added to your bag`);
      window.setTimeout(() => setToast(''), 2600);
    } catch (err) { setToast(err.response?.data?.message || 'Could not add product'); window.setTimeout(() => setToast(''), 2600); }
  }
  async function changeQuantity(productId, quantity) {
    try { await api.patch(`/cart/items/${productId}`, { quantity }); await refreshCart(); }
    catch (err) { setToast(err.response?.data?.message || 'Could not update quantity'); }
  }
  async function removeItem(productId) {
    await api.delete(`/cart/items/${productId}`);
    await refreshCart();
  }

  return(
   <>
   <Header cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)} />
    {toast && <div className="toast" role="status">{toast}</div>}
    <Routes>
      <Route path="/" element={<Home onAdd={addToCart} />} />
      <Route path="/products/:id" element={<ProductDetail onAdd={addToCart} />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/cart" element={<Cart items={cartItems} onChange={changeQuantity} onRemove={removeItem} />} />
      <Route path="/checkout" element={<Checkout items={cartItems} refreshCart={refreshCart} />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/order-success" element={<OrderSuccess />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<main className="page-wrap"><h1>Page not found</h1><a href="/">Back home</a></main>} />
    </Routes>
    <Footer />
    </>);
  
}

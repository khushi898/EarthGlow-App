import React, {
  useCallback,
  useEffect,
  useState
} from 'react';

import {
  Navigate,
  Route,
  Routes,
  useNavigate
} from 'react-router-dom';

import api from './api/client.js';

import { useAuth } from './context/AuthContext.jsx';

import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';

import Home from './pages/Home.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import OrderSuccess from './pages/OrderSuccess.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [toast, setToast] = useState('');

  const refreshCart = useCallback(async () => {
    if (!localStorage.getItem('earthglow_token')) {
      setCartItems([]);
      return;
    }

    try {
      const { data } = await api.get('/cart');

      setCartItems(
        data.cart.items
          .filter(i => i.product)
          .map(i => ({
            product: i.product,
            quantity: i.quantity
          }))
      );
    } catch {
      setCartItems([]);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart, user]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  async function addToCart(product, quantity = 1) {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await api.post('/cart/items', {
        productId: product._id,
        quantity
      });

      await refreshCart();

      showToast(`${product.name} added to your bag`);
    } catch (err) {
      showToast(
        err.response?.data?.message ||
        'Could not add product'
      );
    }
  }

  async function changeQuantity(productId, quantity) {
    try {
      await api.patch(`/cart/items/${productId}`, {
        quantity
      });

      await refreshCart();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
        'Could not update quantity'
      );
    }
  }

  async function removeItem(productId) {
    try {
      await api.delete(`/cart/items/${productId}`);
      await refreshCart();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
        'Could not remove product'
      );
    }
  }

  // The API protects the admin data; this keeps other visitors off the page itself.
  function adminPage() {
    if (!user) return <Navigate to="/login" replace />;

    if (user.role !== 'admin') {
      return (
        <main className="page-wrap">
          <h1>Admin access required</h1>
          <a href="/">Back home</a>
        </main>
      );
    }

    return <Admin />;
  }

  return (
    <>
      <Header
        cartCount={cartItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        )}
      />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={<Home onAdd={addToCart} />}
        />

        <Route
          path="/products/:id"
          element={<ProductDetail onAdd={addToCart} />}
        />

        <Route
          path="/login"
          element={<AuthPage mode="login" />}
        />

        <Route
          path="/register"
          element={<AuthPage mode="register" />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route
          path="/cart"
          element={
            <Cart
              items={cartItems}
              onChange={changeQuantity}
              onRemove={removeItem}
            />
          }
        />

        <Route
          path="/checkout"
          element={
            <Checkout
              items={cartItems}
              refreshCart={refreshCart}
            />
          }
        />

        <Route
          path="/orders"
          element={<Orders />}
        />

        <Route
          path="/order-success"
          element={<OrderSuccess />}
        />

        <Route
          path="/admin"
          element={adminPage()}
        />

        <Route
          path="*"
          element={
            <main className="page-wrap">
              <h1>Page not found</h1>
              <a href="/">Back home</a>
            </main>
          }
        />
      </Routes>

      <Footer />
    </>
  );
}
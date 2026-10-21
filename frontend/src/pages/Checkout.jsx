import React, { useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate
} from 'react-router-dom';

import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Checkout({ items, refreshCart }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedProductIds =
    location.state?.selectedProductIds || [];

  const selectedItems = items.filter(item =>
    selectedProductIds.includes(item.product._id)
  );

  const [form, setForm] = useState({
    fullName: user?.name || '',
    line1: '',
    city: '',
    postcode: '',
    country: 'United Kingdom'
  });

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Reuse the same ID if a request must be retried.
  // A new checkout page gets a new ID.
  const checkoutRequestId = useRef(crypto.randomUUID());
  const submitting = useRef(false);

  const total = selectedItems.reduce(
    (sum, item) =>
      sum + item.product.price * item.quantity,
    0
  );

  function update(e) {
    setForm(previous => ({
      ...previous,
      [e.target.name]: e.target.value
    }));
  }

  async function submit(e) {
    e.preventDefault();

    if (submitting.current || !selectedItems.length) {
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError('');

    try {
      const { data } = await api.post('/orders', {
        checkoutRequestId: checkoutRequestId.current,
        shippingAddress: form,
        items: selectedItems.map(item => ({
          product: item.product._id,
          quantity: item.quantity
        }))
      });

      // Order is already saved by the backend.
      // Refreshing the bag must not block success navigation.
      try {
        await refreshCart();
      } catch (refreshError) {
        console.error('Cart refresh failed:', refreshError);
      }

      navigate('/order-success', {
        replace: true,
        state: { order: data.order }
      });
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(
          err.response?.data?.message ||
          'Unable to place demo order. Please try again.'
        );
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!selectedItems.length) {
    return (
      <main className="page-wrap">
        <h1>No products selected</h1>
        <p>Please select products from your bag.</p>
        <Link to="/cart">Return to your bag</Link>
      </main>
    );
  }

  return (
    <main className="page-wrap checkout-layout">
      <form className="checkout-form" onSubmit={submit}>
        <p className="eyebrow">ALMOST YOURS</p>
        <h1>Delivery details</h1>

        <p className="muted">
          Sign in is required to place your demo order.
        </p>

        {[
          'fullName',
          'line1',
          'city',
          'postcode',
          'country'
        ].map(key => (
          <label key={key}>
            {({
              fullName: 'Full name',
              line1: 'Address line',
              city: 'Town / city',
              postcode: 'Postcode',
              country: 'Country'
            })[key]}

            <input
              required
              name={key}
              value={form[key]}
              onChange={update}
            />
          </label>
        ))}

        {error && (
          <p className="form-error">{error}</p>
        )}

        <button className="button" disabled={busy}>
          {busy ? 'Placing order…' : 'Place demo order'}
        </button>
      </form>

      <aside className="summary">
        <h2>Order total</h2>

        {selectedItems.map(item => (
          <div key={item.product._id}>
            <span>
              {item.product.name} × {item.quantity}
            </span>
            <b>
              £{(
                item.product.price * item.quantity
              ).toFixed(2)}
            </b>
          </div>
        ))}

        <hr />

        <div>
          <strong>Total</strong>
          <strong>£{total.toFixed(2)}</strong>
        </div>

        <p className="muted">
          This educational checkout does not collect
          payment details.
        </p>
      </aside>
    </main>
  );
}
import React,{ useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Checkout({ items, refreshCart }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: user?.name || '', line1: '', city: '', postcode: '', country: 'United Kingdom' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  function update(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post('/orders',
         { 
          shippingAddress: form,
          items:items.map((item)=>({
            product:item.product._id,
            quantity:item.quantity,
          })),
          total,
         });
      await refreshCart();
      navigate('/order-success', { state: { order: data.order } });
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
      else setError(err.response?.data?.message || 'Unable to place demo order.');
    } finally { setBusy(false); }
  }
  if (!items.length) return <main className="page-wrap"><h1>Your bag is empty</h1><Link to="/">Shop products</Link></main>;
  return <main className="page-wrap checkout-layout"><form className="checkout-form" onSubmit={submit}><p className="eyebrow">ALMOST YOURS</p><h1>Delivery details</h1><p className="muted">Sign in is required to place your demo order.</p>
    {['fullName', 'line1', 'city', 'postcode', 'country'].map(key => <label key={key}>{({ fullName: 'Full name', line1: 'Address line', city: 'Town / city', postcode: 'Postcode', country: 'Country' })[key]}<input required name={key} value={form[key]} onChange={update} /></label>)}
    {error && <p className="form-error">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Placing order…' : 'Place demo order'}</button>
  </form><aside className="summary"><h2>Order total</h2>{items.map(i => <div key={i.product._id}><span>{i.product.name} × {i.quantity}</span><b>£{(i.product.price * i.quantity).toFixed(2)}</b></div>)}<hr/><div><strong>Total</strong><strong>£{total.toFixed(2)}</strong></div><p className="muted">This educational checkout does not collect payment details.</p></aside></main>;
}

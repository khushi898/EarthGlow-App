import React,{ useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { if (user) api.get('/orders/my').then(({ data }) => setOrders(data.orders)).catch(() => setError('Could not load orders.')); }, [user]);
  if (!user) return <main className="page-wrap"><h1>Sign in to see your orders</h1><Link className="button" to="/login">Sign in</Link></main>;
  return <main className="page-wrap"><p className="eyebrow">YOUR ACCOUNT</p><h1>My orders</h1>{error && <p className="form-error">{error}</p>}{!orders.length && !error ? <p className="muted">No orders yet. Your first order will appear here.</p> : <div className="orders-list">{orders.map(order => <article className="order-card" key={order._id}><div><strong>Order #{order._id.slice(-7).toUpperCase()}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span></div><div>{order.items.length} item(s)</div><strong>£{order.total.toFixed(2)}</strong><span className="status-pill">{order.status}</span></article>)}</div>}<Link to="/">← Continue shopping</Link></main>;
}

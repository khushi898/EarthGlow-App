
import React from 'react'
import { Link, useNavigate } from 'react-router-dom';

export default function Cart({ items, onChange, onRemove }) {
  const navigate = useNavigate();
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return <main className="page-wrap">
    <div className="section-heading"><div><p className="eyebrow">YOUR SELECTION</p><h1>Your bag</h1></div><Link to="/">Continue shopping</Link></div>
    {!items.length ? <div className="empty-state"><div>♡</div><h2>Your bag is taking a little break.</h2><p>Find something lovely for your daily routine.</p><Link className="button" to="/">Explore products</Link></div> :
    <div className="cart-layout"><div className="cart-items">{items.map(item => <article className="cart-item" key={item.product._id}><img src={item.product.image} alt={item.product.name} /><div className="cart-item-info"><p className="eyebrow">{item.product.category}</p><h3>{item.product.name}</h3><strong>£{(item.product.price * item.quantity).toFixed(2)}</strong><div className="quantity"><button onClick={() => onChange(item.product._id, Math.max(1, item.quantity - 1))}>−</button><span>{item.quantity}</span><button onClick={() => onChange(item.product._id, Math.min(item.product.stock, item.quantity + 1))} disabled={item.quantity >= item.product.stock}>+</button><button className="remove-button" onClick={() => onRemove(item.product._id)}>Remove</button></div></div></article>)}</div>
      <aside className="summary"><h2>Order summary</h2><div><span>Subtotal</span><b>£{total.toFixed(2)}</b></div><div><span>Delivery</span><span>{total >= 35 ? 'Free' : 'Calculated at checkout'}</span></div><p className="muted">Demo checkout — no payment is collected.</p><button className="button button-full" onClick={() => navigate('/checkout')}>Continue to checkout</button></aside></div>}
  </main>;
}

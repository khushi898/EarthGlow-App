import React from 'react';
import { Link, useLocation } from 'react-router-dom';
export default function OrderSuccess() {
  const { state } = useLocation();
  return <main className="empty-state success-state"><div>✓</div><p className="eyebrow">ORDER CONFIRMED</p><h1>Thank you for your order!</h1><p>Your demo order has been created. No payment was taken.</p>{state?.order && <p>Order reference: <b>#{state.order._id.slice(-7).toUpperCase()}</b></p>}<div className="success-actions"><Link className="button" to="/orders">View my orders</Link><Link to="/">Continue shopping</Link></div></main>;
}

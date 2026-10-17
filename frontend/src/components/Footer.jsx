import React from 'react';
import { Link } from 'react-router-dom';
export default function Footer() {
  return <footer className="footer">
    <div><Link className="brand brand-light" to="/">earth<span>glow</span></Link><p>Everyday care, inspired by nature.</p></div>
    <div><strong>Explore</strong><Link to="/">Shop all</Link><Link to="/orders">My orders</Link></div>
    <div><strong>Customer care</strong><span>hello@earthglow.example</span><span>Mon–Fri, 9am–5pm</span></div>
    <small className="copyright">© {new Date().getFullYear()} EarthGlow. Student portfolio project; not affiliated with Mamaearth.</small>
  </footer>;
}

import React from 'react';
import { Link } from 'react-router-dom';
export default function Footer() {
  return <footer className="footer">
    <div><Link className="brand brand-light" to="/">earth<span>glow</span></Link><p>Everyday care, inspired by nature.</p></div>
    <div><strong>Explore</strong><Link to="/">Shop all</Link><Link to="/orders">My orders</Link></div>
    <div><strong>About</strong><span>Demo store: no payment or delivery</span><a href="https://github.com/khushi898/EarthGlow-App" target="_blank" rel="noreferrer">View source on GitHub</a></div>
    <small className="copyright">© {new Date().getFullYear()} EarthGlow. A demo e-commerce project; no real products are sold.</small>
  </footer>;
}

import { Link, NavLink, useNavigate } from 'react-router-dom';
import React,{ useEffect, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';


export default function Header({ cartCount = 0 }) {
  const [menuOpen,setMenuOpen]=useState(false);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // The menu lists the categories that really have products, so no link leads to an empty page.
  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, []);

  function submit(e) {
    e.preventDefault();
    navigate(`/?search=${encodeURIComponent(search)}`);
  }
  return <>
    <div className="announcement">A little care, every day • Demo store: no payment or delivery</div>
    <header className="site-header">
      <Link className="brand" to="/">earth<span>glow</span><small>BOTANICAL BEAUTY</small></Link>
      <form className="search-form" onSubmit={submit}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search face, hair, body care..." aria-label="Search products" />
        <button aria-label="Search">⌕</button>
      </form>
      <nav className="header-actions">
        {user ? <><span className="welcome">Hi, {user.name.split(' ')[0]}</span>
        {user.role === 'admin' && (
          <Link to="/admin">Admin</Link>
        )}
        <button className="text-button" onClick={() => { logout(); navigate('/'); }}>Log out</button></> : <Link to="/login">Sign in</Link>}
        <Link to="/cart" className="cart-link">Bag <b>{cartCount}</b></Link>
      </nav>
    </header>

    <button type='button' className='mobile-menu-btn' onClick={()=>setMenuOpen(!menuOpen)} aria-expanded={menuOpen}
    >
      {menuOpen ? "x Close":"Menu"}
    </button>
    <nav className={`category-nav ${menuOpen ? 'menu-open' : ''}`}>
      {categories.map(category => (
        <Link key={category} to={`/?category=${encodeURIComponent(category)}`}>{category}</Link>
      ))}
      <NavLink to="/orders">My orders</NavLink>
    </nav>
  </>;
}

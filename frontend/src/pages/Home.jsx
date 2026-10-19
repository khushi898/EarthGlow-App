import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Home({ onAdd }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page,setPage]=useState(1);
  const [totalPages,setTotalPages]=useState(1);

  useEffect(()=>{
    setPage(1);
  }, [search,category]);

  useEffect(() => {
    setLoading(true);
    api.get('/products', { params: { search, category,page, limit: 12} })
      .then(({ data }) => { setProducts(prev=> page===1?data.products:[...prev,...data.products]);
        setTotalPages(data.pages);
        setError('');
      })
      .catch(() => setError('Could not load products. Check that the backend and MongoDB are running.'))
      .finally(() => setLoading(false));
    api.get('/categories').then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, [search, category,page]);

  return <main>
    <section className="hero">
      <div className="hero-copy">
        <span className="hero-kicker">YOUR DAILY RITUAL</span>
        <h1>Feel good in<br /><em>your own skin.</em></h1>
        <p>Thoughtful essentials for your face, hair and body — made for everyday moments.</p>
        <a className="button" href="#shop">Explore the collection <span>→</span></a>
        <div className="hero-note"><span>✳</span> Simple routines. Feel-good care.</div>
      </div>
      <div className="hero-art">
        <div className="hero-circle"></div>
        <img src="/images/earthglow-hero.png" alt="Skincare products arranged in natural light" />
        <div className="hero-sticker">NATURE<br />MEETS<br />SELF-CARE</div>
      </div>
    </section>

    <section className="benefits">
      <div><span>🌿</span><p><b>Nature inspired</b><small>Thoughtful daily essentials</small></p></div>
      <div><span>♡</span><p><b>Made for routines</b><small>Easy, feel-good care</small></p></div>
      <div><span>♻</span><p><b>Less fuss</b><small>Simple everyday choices</small></p></div>
    </section>

    <section id="shop" className="shop-section">
      <div className="section-heading"><div><p className="eyebrow">FIND YOUR FAVOURITES</p><h2>{search ? `Results for “${search}”` : category || 'Everyday essentials'}</h2></div><span>{products.length} products</span></div>
      {categories.length > 0 && <div className="category-chips"><a className={!category ? 'active' : ''} href="/">All products</a>{categories.map(c => <a key={c} className={category === c ? 'active' : ''} href={`/?category=${encodeURIComponent(c)}`}>{c}</a>)}</div>}
      {loading ? <p className="state-message">Loading your essentials…</p> : error ? <p className="state-message error">{error}</p> : products.length ? <div className="product-grid">{products.map(p => <ProductCard key={p._id} product={p} onAdd={onAdd} />)}</div> : <p className="state-message">No products found. Try another search.</p>}

      {!loading && page < totalPages && (
  <div style={{ textAlign: 'center', margin: '30px 0' }}>
    <button
      type="button"
      className="button"
      onClick={() => setPage(prev => prev + 1)}
    >
      Load More Products
    </button>
  </div>
)}
    </section>
    <section className="routine-banner"><div><p className="eyebrow">SMALL STEPS, EVERY DAY</p><h2>Your routine,<br />your kind of glow.</h2><p>Build a simple ritual with the essentials you love.</p></div><div className="routine-orb">care<br /><i>for you</i></div></section>
  </main>;
}

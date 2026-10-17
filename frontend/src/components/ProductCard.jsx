import React from 'react';
import { Link } from 'react-router-dom';

export default function ProductCard({ product, onAdd }) {
  return <article className="product-card">
    <Link to={`/products/${product._id}`} className="product-image-wrap">
      {product.compareAtPrice && <span className="sale-badge">SAVE</span>}
      <img src={product.image} alt={product.name} loading="lazy" />
    </Link>
    <div className="product-card-content">
      <p className="eyebrow">{product.category}</p>
      <Link to={`/products/${product._id}`} className="product-name">{product.name}</Link>
      <div className="price-row"><strong>£{product.price.toFixed(2)}</strong>{product.compareAtPrice && <del>£{product.compareAtPrice.toFixed(2)}</del>}</div>
      <button className="button button-small" onClick={() => onAdd(product)}
        disabled={Number(product.stock)<=0}>
        {Number(product.stock)>0 ? "Add to bag":"Outof Stock"} 
          </button>
    </div>
  </article>;
}
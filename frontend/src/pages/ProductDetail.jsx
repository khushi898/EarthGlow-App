import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';

export default function ProductDetail({ onAdd }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [quantity,setQuantity]=useState(1);
  const [selectedImage,setSelectedImage]=useState(0);
  const [zoomOpen,setZoomOpen]=useState(false);

  useEffect(() => { api.get(`/products/${id}`).then(({ data }) => setProduct(data.product)).catch(() => setError('Product not found.')); }, [id]);
  if (error) return <main className="page-wrap"><p>{error}</p><Link to="/">Back to shop</Link></main>;
  if (!product) return <main className="page-wrap">Loading product…</main>;
  return <main className="detail-layout page-wrap">
    
    <div className="product-gallery">
  {(() => {
    const images =
      Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : [product.image].filter(Boolean);

    return (
      <>
        <img
          className="detail-image"
          src={images[selectedImage] || images[0]}
          alt={product.name}
          onClick={()=>setZoomOpen(true)}
          style={{cursor:"zoom-in"}}
        />

        {images.length > 1 && (
          <div className="gallery-thumbnails">
            {images.map((image, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedImage(index)}
                className={selectedImage === index ? "active" : ""}
              >
                <img src={image} alt={`${product.name} ${index + 1}`} />
              </button>
            ))}
          </div>
        )}
        {zoomOpen && (
  <div
    onClick={() => setZoomOpen(false)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.85)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      cursor: "zoom-out",
    }}
  >
    <img
      src={images[selectedImage] || images[0]}
      alt={product.name}
      style={{
        maxWidth: "90%",
        maxHeight: "90vh",
        objectFit: "contain",
      }}
    />
  </div>
)}
      </>
    );
  })()}
</div>
    <div className="detail-copy"><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><div className="price-row detail-price"><strong>£{product.price.toFixed(2)}</strong>{product.compareAtPrice && <del>£{product.compareAtPrice.toFixed(2)}</del>}</div><p>{product.description}</p>
   
      <div className='quantity-selector'>
        <button type='button' onClick={()=>setQuantity(q=>Math.max(1,q-1))} disabled={quantity<=1}
        >
          - 
        </button>
        <span>{quantity}</span>

        <button type='button' onClick={()=>setQuantity(q=>Math.min(product.stock,q+1))} disabled={quantity>= product.stock}
        >
        +
        </button>
      </div>

       <p className="stock-note">
      {product.stock > 0 ? `${product.stock} available` : 'Currently out of stock'}</p><button className="button" disabled={!product.stock} onClick={() => onAdd(product,quantity)}>
      {product.stock>0?"Add to Bag":"Out of Stock"}</button><p className="detail-small">Demo product for this learning project. Product claims and imagery are illustrative.</p><Link to="/">← Continue shopping</Link></div>
  </main>;
}

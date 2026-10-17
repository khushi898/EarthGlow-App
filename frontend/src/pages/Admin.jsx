import React, { useEffect, useState } from "react";
import api from "../api/client.js";

export default function Admin() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderSearch,setOrderSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("All");
  const [orderSort,setOrderSort]=useState("newest");
  const [imagePreview, setImagePreview]=useState("");
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    stock:"",
    description: "",
    image: "",
  });

  const [editingId, setEditingId] = useState(null);
 

  // LOAD PRODUCTS
  const loadProducts = async () => {
    try {
      const { data } = await api.get("/products?1&limit=100");
      setProducts(data.products || []);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  };

  // LOAD ALL ORDERS
  const loadOrders = async () => {
    try {
      const { data } = await api.get("/orders");
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Failed to load orders:", error);
    }
  };

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  // HANDLE FORM INPUT
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // CREATE SLUG
  const createSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // ADD OR UPDATE PRODUCT
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const productData = {
        name: form.name,
        slug: createSlug(form.name),
        price: Number(form.price),
        category: form.category,
        stock: Number(form.stock),
        description: form.description,
        image: form.image,
        images:form.images || [],
      };
      setImagePreview("");

      if (editingId) {
        await api.patch(`/products/${editingId}`, productData);

        alert("Product updated successfully!");
      } else {
        await api.post("/products", productData);

        alert("Product added successfully!");
      }

      setForm({
        name: "",
        price: "",
        category: "",
        description: "",
        image: "",
        images:[],
      });

      setEditingId(null);

      await loadProducts();
    } catch (error) {
      console.error("Failed to save product:", error);

      alert(
        error.response?.data?.message ||
          "Could not save product."
      );
    }
  };

  // EDIT PRODUCT
  const handleEdit = (product) => {
    setEditingId(product._id);

    setForm({
      name: product.name || "",
      price: product.price || "",
      category: product.category || "",
      stock: product.stock || "",
      description: product.description || "",
      image: product.image || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // CANCEL EDIT
  const handleCancelEdit = () => {
    setEditingId(null);

    setForm({
      name: "",
      price: "",
      category: "",
      description: "",
      image: "",
    });
  };

  // DELETE PRODUCT
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await api.delete(`/products/${id}`);

      alert("Product deleted successfully!");

      await loadProducts();
    } catch (error) {
      console.error("Failed to delete product:", error);

      alert(
        error.response?.data?.message ||
          "Could not delete product."
      );
    }
  };

  // UPDATE ORDER STATUS
  const handleStatusChange = async (orderId, status) => {
    try {
      await api.patch(`/orders/${orderId}/status`, {
        status: status,
      });

      alert("Order status updated successfully!");

      await loadOrders();
    } catch (error) {
      console.error("Failed to update order:", error);

      alert(
        error.response?.data?.message ||
          "Could not update order status."
      );
    }
  };
  async function handleRestock(product) {
  const amount = prompt(
    `How many units do you want to add to ${product.name}?`
  );

  if (!amount || Number(amount) <= 0) return;

  try {
    await api.patch(`/products/${product._id}`, {
      
      stock: Number(product.stock || 0) + Number(amount),
    });

     await loadProducts();
  } catch (error) {
  console.log("RESTOCK ERROR:", error.response?.status);
  console.log("RESTOCK DATA:", error.response?.data);
  console.log("FULL ERROR:", error);
  alert("Could not update stock");
}
}

  return (
    <main className="container admin-container">
     <div className="admin-heading">
      <h1>Admin Dashboard</h1>
      <p>Manage your EarthGlow products & customer orders.</p>
     </div>
<div className="admin-stats">
  <div className="admin-stat-card">
    <h3>{products.length}</h3>
    <p>Products</p>
  </div>

  <div className="admin-stat-card">
    <h3>{orders.length}</h3>
    <p>Orders</p>
  </div>

  <div className="admin-stat-card">
    <h3>
      {
        orders.filter(
          (order) => order.status?.toLowerCase() === "processing"
        ).length
      }
    </h3>
    <p>Processing</p>
  </div>

  <div className="admin-stat-card">
    <h3>
      £
      {orders
      .filter((order)=>order.status!=="Cancelled")
        .reduce((total, order) => total + Number(order.total || 0), 0)
        .toFixed(2)}
    </h3>
    <p>Total Sales</p>
  </div>
</div>
      <hr />

      {/* ADD / EDIT PRODUCT */}
      <section>
        <h2>
          {editingId ? "Edit Product" : "Add New Product"}
        </h2>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div>
            <label>Product Name</label>
            <br />

            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Product name"
              required
            />
          </div>

          <div>
            <label>Price</label>
            <br />

            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              placeholder="Price"
              min="0"
              step="0.01"
              required
            />
          </div>

          <br />
        

          <div>
            <label>Category</label>
            <select
  name="category"
  value={form.category}
  onChange={handleChange}
  required
>
  <option value="">Select category</option>
  <option value="Face Care">Face</option>
  <option value="Hair Care">Hair</option>
  <option value="Body">Body</option>
  <option value="Baby">Baby</option>
  <option value="Moisturisers">Moisturisers</option>
  <option value="Serums">Serums</option>
</select>

            
          </div>
          <label>Stock</label>
          <input type="number"
          name="stock"
          value={form.stock}
          onChange={handleChange}
          placeholder="Stock Quantity"
          min="0"
          required
          />

          <br />

          <div className="form-field-full">
            <label>Description</label>
            <br />

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Product description"
              rows="4"
              required
            />
          </div>

       

          <div className="form-field-full">
            <label>Image URL</label>
            <br />

            <input
              type="text"
              name="image"
              value={form.image}
              onChange={handleChange}
              placeholder="https://example.com/product.jpg"
              required
            />
          </div>

          <div className="form-field-full">

            <label>Or Choose Product Image</label>
            <br/>
            <input 
            type="file"
          accept="image/*"
          multiple
          
          onChange={async (e) => {
  const files = Array.from(e.target.files);

  if (files.length === 0) return;

  const images = await Promise.all(
    files.map((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(file);
      });
    })
  );

  setImagePreview(images[0]);

  setForm((prev) => ({
    ...prev,
    image: images[0],
    images: images,
  }));
}}/>
          </div>
          {imagePreview && (
            <div className="product-image-preview">
              <img src={imagePreview}
              alt="Product Preview"
              style={{
                width:'180px',
                height:'180px',
                
              }}
              />
            </div>
          )}

          <br />

          <button type="submit">
            {editingId ? "Update Product" : "Add Product"}
          </button>

          {editingId && (
            <>
              {" "}

              <button
                type="button"
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </button>
            </>
          )}
        </form>
      </section>

      <br />
      <hr />

      {/* PRODUCTS */}
     <section className="admin-products">
  <h2>Products</h2>

  {products.length === 0 ? (
    <p>No products found.</p>
  ) : (
    products.map((product) => (
      <div className="admin-product-card" key={product._id}>
        <img 
          src={product.image}
          alt={product.name}
          className="admin-product-image"
          />
        <div className="admin-product-info">
          <span className="admin-product-name">
            {product.name}
          </span>

          <span className="admin-product-price">
            £{Number(product.price).toFixed(2)}
          </span>
          <span className={
            Number(product.stock)===0
            ? "admin-product-stock out-stock"
            : Number(product.stock)<=5
            ? "admin-product-stock low-stock"
            : "admin-product-stock"
          }
          >
            {Number(product.stock)===0
            ?"Out of Stock"
          :Number(product.stock)<=5
          ?`Low Stock:${product.stock}`
        :`Stock :${product.stock}`}
          </span>
          <span className="admin-product-category">
            {product.category}
          </span>
        </div>
        <button type="button"
        className="restock-btn"
        onClick={()=>handleRestock(product)}
        >Restock</button>

        <div className="admin-product-actions">
          <button
            type="button"
            className="admin-edit-btn"
            onClick={() => handleEdit(product)}
          >
            Edit
          </button>

          <button
            type="button"
            className="admin-delete-btn"
            onClick={() => handleDelete(product._id)}
          >
            Delete
          </button>
        </div>
      </div>
    ))
  )}
</section>

      <br />
      <hr />

      {/* CUSTOMER ORDERS */}
      <section>
        <h2>Customer Orders</h2>
        <input
          type="text"
          placeholder="Search orders..."
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
          className="order-search"
        />
        <div className="order-summary">
          <select
  value={statusFilter}
  onChange={(e) => setStatusFilter(e.target.value)}
  className="order-filter"
>
  <option value="All">All Statuses</option>
  <option value="Placed">Placed</option>
  <option value="Processing">Processing</option>
  <option value="Shipped">Shipped</option>
  <option value="Delivered">Delivered</option>
  <option value="Cancelled">Cancelled</option>
</select>

<button 
 type="button"
 className="clear-filter-btn"
 onClick={()=>{
  setOrderSearch("");
  setStatusFilter("All");
 }}
 >
  Clear Filters
 </button>

 <select 
  value={orderSort}
  onChange={(e)=>setOrderSort(e.target.value)}
  className="order-filter"
  >
    <option value="newest">Newest First</option>
    <option value="oldest">Oldest First</option>
  </select>
  <div className="order-summary-card">
    <strong>{orders.length}</strong>
    <span>Total Orders</span>
  </div>

  <div className="order-summary-card">
    <strong>
      £{orders
      .filter((order)=>order.status !=="Cancelled")
    .reduce((total,order)=>total+Number(order.total||0),0)
    .toFixed(2)}
    </strong>
    <span>Revenue</span>
  </div>
 
 <div className="order-summary-card">
  <strong>
    {orders.filter((order) => order.status === "Placed").length}
  </strong>
  <span>Placed</span>
</div>
  <div className="order-summary-card">
  <strong>
    {orders.filter((order) => order.status === "Processing").length}
  </strong>
  <span>Processing</span>
</div>
<div className="order-summary-card">
  <strong>
    {orders.filter((order) => order.status === "Shipped").length}
  </strong>
  <span>Shipped</span>
</div>
  <div className="order-summary-card">
    <strong>
      {orders.filter((order) => order.status === "Delivered").length}
    </strong>
    <span>Delivered</span>
  </div>

  <div className="order-summary-card">
    <strong>
      {orders.filter((order) => order.status === "Cancelled").length}
    </strong>
    <span>Cancelled</span>
  </div>
</div>

        {orders.length === 0 ? (
          <p>No orders found.</p>
        ) : (
          [...orders]
          .sort((a,b)=>
          orderSort ==="newest"
        ?new Date(b.createdAt)-new Date(a.createdAt)
        :new Date(a.createdAt)-new Date(b.createdAt))
          
  .filter((order) => {
    const search = orderSearch.toLowerCase();

   return (
  (statusFilter === "All" || order.status === statusFilter) &&
  (
    order._id?.toLowerCase().includes(search) ||
    order.user?.name?.toLowerCase().includes(search) ||
    order.user?.email?.toLowerCase().includes(search)
  )
);
  })
  .map((order) => (
            <div
              key={order._id}
              className="admin-order-card"
              
            >
              <strong>Order:</strong> {order._id}

              <br />

              <strong>Customer:</strong>{" "}
              {order.user?.name || "Customer"}

              <br />

              <strong>Email:</strong>{" "}
              {order.user?.email || "No email"}

              <br />

              <strong>Total:</strong>{" "}
              £{Number(order.total || 0).toFixed(2)}

              <br />
              <strong>Ordered:</strong>{""}
              {order.createdAt
              ?
              new Date(order.createdAt).toLocaleDateString("en-GB")
              : "date unavailable"}
             <br />


<strong>Items:</strong>{" "}
{order.items?.reduce((total, item) => total + (item.qty || 1), 0) || 0}
<br />
{order.items?.map((item, index) => (
  <div key={index} className="order-item-name">
    <strong>Product:</strong>{" "}
    {item.product?.name || item.name || "Product"} × {item.qty || 1}
  </div>
))}




              <strong>Status:</strong>{" "}

              <select
       className={`status-select status-${order.status.toLowerCase()}`}
       value={order.status}
       onChange={(e)=>handleStatusChange(order._id, e.target.value)}
>
  <option value="Placed">Placed</option>
  <option value="Processing">Processing</option>
  <option value="Shipped">Shipped</option>
  <option value="Delivered">Delivered</option>
  <option value="Cancelled">Cancelled</option>
</select>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
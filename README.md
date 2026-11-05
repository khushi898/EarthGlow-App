# EarthGlow — full-stack skincare storefront

A portfolio e-commerce project inspired by the shopping experience of beauty and skincare stores. It uses original EarthGlow branding and demo data. It is not a real shop: no payment is taken and nothing is delivered.

**Live demo:** https://earthglow-app.onrender.com (the first visit can take about 30 seconds while the free server wakes up)

![EarthGlow home page](docs/screenshots/home.jpg)

| Product list | Product page |
|---|---|
| ![Product list](docs/screenshots/products.jpg) | ![Product page](docs/screenshots/product-detail.jpg) |

## Features
- Browse products with search, category filters and "load more"
- Customer accounts with sign-in and password reset by email
- A shopping bag where you choose which products to buy
- Demo checkout with order history
- Admin dashboard to manage products, stock and order status
- Server-side prices, stock checks that prevent overselling, and protection against duplicate orders
- Rate limiting on account and sign-in routes

## Stack
- Frontend: React + Vite, React Router, Axios, plain CSS
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: bcryptjs + JWT
- Email: Resend (password reset, plus login codes for the test account)

## Requirements
- Node.js 20+
- MongoDB Atlas (easiest), or local MongoDB running as a replica set

Checkout uses MongoDB transactions, which do not work on a plain standalone server.

### Option A: MongoDB Atlas
Create a free cluster and use its connection string as `MONGO_URI`.

### Option B: local MongoDB
Stop MongoDB first if it is already running as a service, then start it as a single-node replica set with an existing, empty data folder:
```bash
mongod --replSet rs0 --dbpath /path/to/empty-folder
mongosh --eval "rs.initiate()"   # first time only, in another terminal
```
Use the `MONGO_URI` from `.env.example`.

## 1) Start the backend
```bash
cd backend
cp .env.example .env
# Edit .env: set MONGO_URI, JWT_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD
npm install
npm run seed           # on a new Atlas database: node src/seed.js --force
node src/addProducts.js
npm run dev
```
Backend: http://localhost:5000
Health check: http://localhost:5000/api/health

The two data scripts do different jobs:
- `npm run seed` **deletes all products**, then adds 8 sample products and the admin account from `.env`. It refuses to run against a non-local database unless you run `node src/seed.js --force`.
- `node src/addProducts.js` adds the 35 catalogue products, or updates them if they already exist. It deletes nothing.

Running both gives 43 products. The live demo only has the 35 catalogue products.

## 2) Start the frontend
Open another terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Frontend: http://localhost:5173

## API overview
- `GET /api/health`
- `GET /api/products?search=&category=&page=1&limit=12` (`limit` is at most 48)
- `GET /api/products/:id`
- `GET /api/categories`
- `POST /api/auth/register` body `{ "name", "email", "password" }`
- `POST /api/auth/login` body `{ "email", "password" }`
- `POST /api/auth/verify-login` body `{ "email", "code" }`
- `POST /api/auth/forgot-password` body `{ "email" }`
- `POST /api/auth/reset-password` body `{ "token", "password" }`
- `GET /api/auth/me` (Bearer token)
- `GET /api/cart` (Bearer token)
- `POST /api/cart/items` body `{ "productId", "quantity" }` (Bearer token)
- `PATCH /api/cart/items/:productId` body `{ "quantity" }` (Bearer token)
- `DELETE /api/cart/items/:productId` (Bearer token)
- `POST /api/orders` body `{ "checkoutRequestId", "items": [{ "product", "quantity" }], "shippingAddress": { "fullName", "line1", "city", "postcode", "country" } }` (Bearer token)
- `GET /api/orders/my` (Bearer token)
- Admin only:
  - `POST /api/products`
  - `PATCH /api/products/:id`
  - `POST /api/products/:id/restock` body `{ "quantity" }`
  - `DELETE /api/products/:id`
  - `GET /api/orders`
  - `PATCH /api/orders/:id/status` body `{ "status" }`

## Order statuses
`Placed → Processing → Shipped → Delivered`. An order can be `Cancelled` while it is `Placed` or `Processing`, which returns its stock.

## Email
Sending email needs `RESEND_API_KEY`. The app runs without it, but password-reset emails will not arrive.

- **Test mode (`EMAIL_TEST_MODE=true`):** only `EMAIL_TEST_TO` receives email, because Resend's test sender cannot email anyone else. That account must also enter an emailed code to sign in, which needs `OTP_SECRET`.
- **All customers:** verify a domain with Resend, set `EMAIL_FROM` and set `EMAIL_TEST_MODE=false`.

## Notes
- This project does not have automated tests yet.
- For production, add tests, a payment provider, email verification, logging and deployment configuration.
- Never commit `.env` files or real secrets.

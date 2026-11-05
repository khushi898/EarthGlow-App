# EarthGlow — full-stack skincare storefront

A portfolio e-commerce project inspired by the shopping experience of beauty and skincare stores. It uses original EarthGlow branding and demo data. It is not a real shop: no payment is taken and nothing is delivered.

## Stack
- Frontend: React + Vite, React Router, Axios, plain CSS
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: bcryptjs + JWT
- Email: Resend (password reset and login codes)

## Requirements
- Node.js 20+
- MongoDB Atlas, or local MongoDB running as a replica set

Checkout uses MongoDB transactions, which do not work on a plain standalone server. For local MongoDB, start it as a single-node replica set:
```bash
mongod --replSet rs0
mongosh --eval "rs.initiate()"   # first time only, in another terminal
```

## 1) Start the backend
```bash
cd backend
cp .env.example .env
# Edit .env: set MONGO_URI, JWT_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD
npm install
npm run seed
npm run dev
```
Backend: http://localhost:5000
Health check: http://localhost:5000/api/health

`npm run seed` **deletes all products**, then adds 8 sample products and the admin account from `.env`. It refuses to run against a non-local database unless you run `node src/seed.js --force`.

`node src/addProducts.js` adds the full product catalogue.

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
With `EMAIL_TEST_MODE=true`, only `EMAIL_TEST_TO` receives email, because Resend's test sender cannot email anyone else. To email every customer, verify a domain with Resend, set `EMAIL_FROM` and set `EMAIL_TEST_MODE=false`.

## Notes
- For production, add a payment provider, email verification, logging and deployment configuration.
- Never commit `.env` files or real secrets.

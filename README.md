# EarthGlow — Mamaearth-inspired full-stack storefront

An educational e-commerce project inspired by the shopping experience of beauty/skincare stores. It uses original EarthGlow branding and demo data; it is not affiliated with Mamaearth.

## Stack
- Frontend: React + Vite, React Router, Axios, plain CSS
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: bcryptjs + JWT
- Payments: checkout creates a demo order only; no real payment is collected.

## Requirements
- Node.js 20+
- MongoDB Community running locally, or a MongoDB Atlas connection string

## 1) Start the backend
```bash
cd backend
cp .env.example .env
# Edit .env and set MONGO_URI and a long JWT_SECRET
npm install
npm run seed
npm run dev
```
Backend: http://localhost:5000
Health check: http://localhost:5000/api/health
Products: http://localhost:5000/api/products

Demo admin (created by seed):
- Email: admin@earthglow.local
- Password: ChangeMe123!
Change this password before using the project beyond local learning.

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
- `GET /api/products?search=&category=&page=1&limit=12`
- `GET /api/products/:id`
- `GET /api/categories`
- `POST /api/auth/register` body `{ "name", "email", "password" }`
- `POST /api/auth/login` body `{ "email", "password" }`
- `GET /api/auth/me` (Bearer token)
- `GET /api/cart` (Bearer token)
- `POST /api/cart/items` body `{ "productId", "quantity" }` (Bearer token)
- `PATCH /api/cart/items/:productId` body `{ "quantity" }` (Bearer token)
- `DELETE /api/cart/items/:productId` (Bearer token)
- `POST /api/orders` body `{ "shippingAddress": { "fullName", "line1", "city", "postcode", "country" } }` (Bearer token)
- `GET /api/orders/my` (Bearer token)
- Admin only:
  - `POST /api/products`
  - `PATCH /api/products/:id`
  - `DELETE /api/products/:id`
  - `GET /api/orders`

## Notes
- The demo checkout creates an order with status `placed`; it does not take payment or dispatch goods.
- For production, add payment-provider webhooks, rate limiting, email verification, password reset, stronger validation, logging, tests, and deployment configuration.
- Never commit `.env` files or real secrets.

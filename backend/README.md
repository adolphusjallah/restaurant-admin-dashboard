# Restaurant Admin Dashboard API

Node.js + Express + MongoDB backend for the Restaurant Admin Dashboard.

## Features

- Admin authentication with signed tokens
- Password hashing using Node.js `crypto.scrypt`
- Restaurant CRUD
- Restaurant owner accounts
- Restaurant activation/suspension
- Plans and commission settings
- Orders and order status
- Payments and payment methods
- Dashboard statistics
- Owner-scoped access to their restaurant
- Admin-only restaurant management

## Setup

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Set a real MongoDB connection string, a strong `TOKEN_SECRET`, and the initial admin credentials in `.env`.

Default API: `http://localhost:5000`

## Main endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET/POST /api/restaurants`
- `PATCH/DELETE /api/restaurants/:id`
- `GET/POST /api/orders`
- `PATCH /api/orders/:id`
- `GET/POST /api/payments`

All endpoints except health and login require a Bearer token.

Never commit `.env`, database credentials, or production secrets.

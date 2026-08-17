# Restaurant Admin Dashboard API

Node.js + Express + MongoDB backend for restaurant administration.

## Setup

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and set `MONGODB_URI`.

```bash
npm run dev
```

API runs on `http://localhost:5000` by default.

## Endpoints

- `GET /api/health`
- `GET /api/restaurants`
- `POST /api/restaurants`
- `PATCH /api/restaurants/:id`
- `DELETE /api/restaurants/:id`

Never commit `.env` or database credentials.

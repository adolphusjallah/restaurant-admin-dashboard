# Restaurant Admin Dashboard

Full-stack restaurant administration project.

## Structure

- `index.html` — dashboard UI
- `styles.css` — responsive dark dashboard styling
- `app.js` — frontend REST API integration
- `backend/` — Node.js + Express + MongoDB API

## Frontend

Run with VS Code Live Server or any static server. The frontend uses `http://localhost:5000/api` by default. To point it at a deployed API, set `localStorage.restaurant_api_url` to the API base URL before loading the page.

## Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Set `MONGODB_URI` in `.env`. Never commit `.env`.

## Current API

- `GET /api/health`
- `GET /api/restaurants`
- `POST /api/restaurants`
- `PATCH /api/restaurants/:id`
- `DELETE /api/restaurants/:id`

## Dashboard features

- Restaurant overview statistics
- Search and filtering
- Create restaurant
- Commission and plan editing
- WhatsApp and Mobile Money settings
- Activate / suspend restaurant
- Delete restaurant
- MongoDB persistence through the backend API

## Production roadmap

For production deployment, add authentication/authorization, audit logging, rate limiting, password reset, owner accounts, order and payment collections, automated commission calculations, notification integrations, and hosted frontend/backend environment variables.
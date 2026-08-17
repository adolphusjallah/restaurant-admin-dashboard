// Restaurant Admin authentication module.
// Set window.RESTAURANT_API_URL before this script if the backend is deployed online.
// Example: window.RESTAURANT_API_URL = 'https://your-backend.onrender.com/api';
const AUTH_API = window.RESTAURANT_API_URL || localStorage.getItem('restaurant_api_url') || 'http://localhost:5000/api';

async function loginAdmin(email, password) {
  const response = await fetch(`${AUTH_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Login failed');
  if (!data.token) throw new Error('The server did not return an authentication token.');

  localStorage.setItem('restaurant_admin_token', data.token);
  localStorage.setItem('restaurant_admin_user', JSON.stringify(data.user || {}));
  return data;
}

function getAuthToken() {
  return localStorage.getItem('restaurant_admin_token');
}

function logoutAdmin() {
  localStorage.removeItem('restaurant_admin_token');
  localStorage.removeItem('restaurant_admin_user');
}

async function checkAuth() {
  const token = getAuthToken();
  if (!token) return null;

  const response = await fetch(`${AUTH_API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    logoutAdmin();
    return null;
  }
  return response.json();
}

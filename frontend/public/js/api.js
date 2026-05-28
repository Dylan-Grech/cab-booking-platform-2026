const GATEWAY = window.GATEWAY_URL || 'http://localhost:3000';

function getToken() { return localStorage.getItem('token'); }

function authHeader() {
  return { 'Authorization': `Bearer ${getToken()}` };
}

async function req(url, options = {}) {
  const res = await fetch(GATEWAY + url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  // ── Auth ──────────────────────────────────────────
  register: (firstName, lastName, email, password) =>
    req('/api/customers/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password }),
    }),

  login: (email, password) =>
    req('/api/customers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  // ── Customers ─────────────────────────────────────
  getNotifications: (userId) =>
    req(`/api/customers/${userId}/notifications`, { headers: authHeader() }),

  // ── Bookings ──────────────────────────────────────
  createBooking: (data) =>
    req('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getCurrentBookings: (userId) => req(`/api/bookings/user/${userId}/current`),
  getPastBookings:    (userId) => req(`/api/bookings/user/${userId}/past`),

  // ── Fare ──────────────────────────────────────────
  getFareEstimate: (from, to) =>
    req(`/api/fare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),

  // ── Payments ──────────────────────────────────────
  processPayment: (bookingId, userId) =>
    req('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, userId }),
    }),

  getPayment: (bookingId) => req(`/api/payments/${bookingId}`),

  // ── Locations ─────────────────────────────────────
  addLocation: (userId, name, address) =>
    req('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name, address }),
    }),

  getLocations:  (userId) => req(`/api/locations/${userId}`),
  getWeather:    (userId) => req(`/api/locations/${userId}/weather`),

  deleteLocation: (id) =>
    req(`/api/locations/${id}`, { method: 'DELETE' }),

  updateLocation: (id, name, address) =>
    req(`/api/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address }),
    }),
};

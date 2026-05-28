// ── State ────────────────────────────────────────────────────────────────────
const state = { user: null };

// ── Utils ─────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showAlert(id, msg, type = 'danger') {
  const el = $(id);
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('d-none');
  if (type !== 'success') setTimeout(() => el.classList.add('d-none'), 6000);
}

function fmtDate(d)  { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
function fmtDT(d)    { return new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }

function cabBadge(type) {
  const c = { Economic: 'success', Premium: 'warning', Executive: 'danger' };
  return `<span class="badge bg-${c[type] || 'secondary'}">${type}</span>`;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function showAuth(form = 'login') {
  $('auth-section').style.display = '';
  $('app-section').style.display  = 'none';
  $('login-form').style.display    = form === 'login'    ? '' : 'none';
  $('register-form').style.display = form === 'register' ? '' : 'none';
}

function showApp() {
  $('auth-section').style.display = 'none';
  $('app-section').style.display  = '';
  $('nav-username').textContent   = `${state.user.firstName} ${state.user.lastName}`;
}

function saveSession(user, token) {
  state.user = user;
  localStorage.setItem('user',  JSON.stringify(user));
  localStorage.setItem('token', token);
}

function clearSession() {
  state.user = null;
  localStorage.removeItem('user');
  localStorage.removeItem('token');
}

// ── Navigation ────────────────────────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  $(`page-${page}`).style.display = '';
  document.querySelectorAll('[data-page]').forEach(l => l.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  ({ overview: loadOverview, 'new-booking': loadNewBooking,
     'current-bookings': loadCurrentBookings, 'past-bookings': loadPastBookings,
     locations: loadLocations, inbox: loadInbox })[page]?.();
}

// ── Overview ──────────────────────────────────────────────────────────────────
async function loadOverview() {
  try {
    const [cur, past, notifs] = await Promise.all([
      api.getCurrentBookings(state.user.id),
      api.getPastBookings(state.user.id),
      api.getNotifications(state.user.id),
    ]);
    $('stat-current').textContent = cur.bookings.length;
    $('stat-past').textContent    = past.bookings.length;
    $('stat-notifs').textContent  = notifs.notifications.length;
    updateBadge(notifs.notifications.length);

    const el = $('overview-notifications');
    el.innerHTML = notifs.notifications.length
      ? notifs.notifications.slice(0, 5).map(notifRow).join('')
      : '<p class="text-muted mb-0">No notifications yet.</p>';
  } catch (e) { console.error(e); }
}

// ── New Booking ───────────────────────────────────────────────────────────────
function loadNewBooking() {
  $('book-date').min = new Date().toISOString().split('T')[0];
  $('fare-preview').classList.add('d-none');
  $('booking-success').classList.add('d-none');
  $('booking-error').classList.add('d-none');
}

async function getFarePreview() {
  const from = $('book-from').value.trim();
  const to   = $('book-to').value.trim();
  const time = $('book-time').value;
  const pax  = parseInt($('book-passengers').value);
  const cab  = $('book-cabtype').value;

  if (!from || !to)  return showAlert('booking-error', 'Enter both From and To locations.');
  if (!time)         return showAlert('booking-error', 'Select a departure time.');

  const btn = $('btn-get-fare');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Calculating...';
  try {
    const { fare } = await api.getFareEstimate(from, to);
    const cabM  = { Economic: 1, Premium: 1.2, Executive: 1.4 }[cab];
    const hr    = parseInt(time.split(':')[0]);
    const timeM = hr >= 8 ? 1 : 1.2;
    const paxM  = pax <= 4 ? 1 : 2;
    const total = (fare * cabM * timeM * paxM).toFixed(2);

    $('fare-base').textContent     = `€${fare.toFixed(2)}`;
    $('fare-cab-mult').textContent  = `× ${cabM}  (${cab})`;
    $('fare-time-mult').textContent = `× ${timeM}  (${hr >= 8 ? 'Daytime' : 'Night (12am–8am)'})`;
    $('fare-pass-mult').textContent = `× ${paxM}  (${pax} passenger${pax > 1 ? 's' : ''})`;
    $('fare-total').textContent     = `€${total}`;
    $('fare-preview').classList.remove('d-none');
    $('booking-error').classList.add('d-none');
  } catch (e) {
    showAlert('booking-error', e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-calculator me-1"></i>Get Fare Estimate';
  }
}

async function createBooking() {
  const from = $('book-from').value.trim();
  const to   = $('book-to').value.trim();
  const date = $('book-date').value;
  const time = $('book-time').value;
  const pax  = parseInt($('book-passengers').value);
  const cab  = $('book-cabtype').value;

  if (!from || !to || !date || !time) return showAlert('booking-error', 'Please fill in all fields.');

  const btn = $('btn-create-booking');
  btn.disabled = true;
  try {
    const { booking } = await api.createBooking({
      userId: state.user.id, startLocation: from, endLocation: to,
      date, time, passengers: pax, cabType: cab,
    });
    showAlert('booking-success',
      `Booking confirmed! Your cab will be ready in ~3 minutes. (ID: ${booking.id})`, 'success');
    $('fare-preview').classList.add('d-none');
    ['book-from','book-to','book-date','book-time'].forEach(id => $(id).value = '');
    $('book-passengers').value = 1;
  } catch (e) {
    showAlert('booking-error', e.message);
  } finally {
    btn.disabled = false;
  }
}

// ── Bookings ──────────────────────────────────────────────────────────────────
async function loadCurrentBookings() {
  const el = $('current-bookings-list');
  el.innerHTML = '<p class="text-muted">Loading...</p>';
  try {
    const { bookings } = await api.getCurrentBookings(state.user.id);
    el.innerHTML = bookings.length
      ? bookings.map(b => bookingCard(b, true)).join('')
      : '<p class="text-muted">No upcoming bookings.</p>';
  } catch (e) { el.innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

async function loadPastBookings() {
  const el = $('past-bookings-list');
  el.innerHTML = '<p class="text-muted">Loading...</p>';
  try {
    const { bookings } = await api.getPastBookings(state.user.id);
    el.innerHTML = bookings.length
      ? bookings.map(b => bookingCard(b, false)).join('')
      : '<p class="text-muted">No past bookings.</p>';
  } catch (e) { el.innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

function bookingCard(b, canPay) {
  return `
    <div class="card mb-3" id="bc-${b.id}">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h6 class="mb-1">
              <i class="bi bi-geo-alt-fill text-primary me-1"></i>${b.startLocation}
              <i class="bi bi-arrow-right mx-2 text-muted"></i>
              <i class="bi bi-geo-alt-fill text-danger me-1"></i>${b.endLocation}
            </h6>
            <p class="text-muted small mb-1">
              ${fmtDate(b.date)} &nbsp;at&nbsp; ${b.time} &nbsp;·&nbsp;
              ${b.passengers} passenger${b.passengers > 1 ? 's' : ''}
            </p>
            <span class="text-muted" style="font-size:0.75rem">ID: ${b.id}</span>
          </div>
          <div class="text-end">
            ${cabBadge(b.cabType)}
            ${canPay ? `<div class="mt-2">
              <button class="btn btn-sm btn-success pay-btn" onclick="payBooking('${b.id}', this)">
                <i class="bi bi-credit-card me-1"></i>Pay
              </button>
            </div>` : ''}
          </div>
        </div>
        <div id="pay-result-${b.id}"></div>
      </div>
    </div>`;
}

async function payBooking(bookingId, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  try {
    const { payment } = await api.processPayment(bookingId, state.user.id);
    $(`pay-result-${bookingId}`).innerHTML = `
      <hr class="my-2">
      <div class="bg-success bg-opacity-10 rounded p-2 small">
        <i class="bi bi-check-circle-fill text-success me-1"></i>
        <strong>Payment successful!</strong> &nbsp; Total: <strong>€${payment.totalPrice}</strong>
        ${payment.discountApplied ? '<span class="badge bg-success ms-2">10% discount applied</span>' : ''}
        <div class="text-muted mt-1">
          Base €${payment.cabFare} × ${payment.cabMultiplier} (cab) × ${payment.daytimeMultiplier} (time) × ${payment.passengersMultiplier} (pax)
        </div>
      </div>`;
    btn.remove();
  } catch (e) {
    $(`pay-result-${bookingId}`).innerHTML = `<p class="text-danger small mt-2">${e.message}</p>`;
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-credit-card me-1"></i>Pay';
  }
}

// ── Locations ─────────────────────────────────────────────────────────────────
let _locations = [];

async function loadLocations() {
  $('locations-list').innerHTML = '<p class="text-muted">Loading...</p>';
  try {
    const { locations } = await api.getLocations(state.user.id);
    _locations = locations;
    renderLocations(locations);
  } catch (e) { $('locations-list').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

function renderLocations(locations, weatherMap = {}) {
  if (!locations.length) {
    $('locations-list').innerHTML = '<p class="text-muted">No saved locations yet.</p>';
    return;
  }
  $('locations-list').innerHTML = locations.map(loc => {
    const w = weatherMap[loc.id];
    return `
      <div class="card mb-3">
        <div class="card-body d-flex justify-content-between align-items-start gap-3">
          <div class="flex-grow-1">
            <h6 class="mb-1"><i class="bi bi-pin-map-fill text-primary me-1"></i>${loc.name}</h6>
            <p class="text-muted small mb-1">${loc.address}</p>
            ${w ? `<div class="small text-info mt-1">
              <i class="bi bi-thermometer-half me-1"></i><strong>${w.temperatureC}°C</strong>
              &nbsp;·&nbsp; ${w.condition}
              &nbsp;·&nbsp; <i class="bi bi-droplet"></i> ${w.humidity}%
              &nbsp;·&nbsp; <i class="bi bi-wind"></i> ${w.windKph} km/h
              ${w.source === 'fallback' ? ' <span class="text-muted">(simulated)</span>' : ''}
            </div>` : ''}
          </div>
          <button class="btn btn-sm btn-outline-danger flex-shrink-0"
                  onclick="deleteLocation('${loc.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>`;
  }).join('');
}

async function addLocation() {
  const name    = $('loc-name').value.trim();
  const address = $('loc-address').value.trim();
  if (!name || !address) return showAlert('location-error', 'Name and address are required.');
  const btn = $('btn-add-location');
  btn.disabled = true;
  try {
    await api.addLocation(state.user.id, name, address);
    $('loc-name').value = '';
    $('loc-address').value = '';
    await loadLocations();
  } catch (e) {
    showAlert('location-error', e.message);
  } finally { btn.disabled = false; }
}

async function deleteLocation(id) {
  if (!confirm('Delete this location?')) return;
  try {
    await api.deleteLocation(id);
    await loadLocations();
  } catch (e) { alert(e.message); }
}

async function loadWeather() {
  const btn = $('btn-load-weather');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Loading...';
  try {
    const { weatherData } = await api.getWeather(state.user.id);
    const map = {};
    weatherData.forEach(({ location, weather }) => { map[location.id] = weather; });
    renderLocations(_locations, map);
  } catch (e) { alert(e.message); }
  finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-cloud-sun me-1"></i>Load Weather';
  }
}

// ── Inbox ─────────────────────────────────────────────────────────────────────
async function loadInbox() {
  $('inbox-list').innerHTML = '<p class="text-muted">Loading...</p>';
  try {
    const { notifications } = await api.getNotifications(state.user.id);
    updateBadge(notifications.length);
    $('inbox-list').innerHTML = notifications.length
      ? notifications.map(notifRow).join('')
      : '<p class="text-muted">Your inbox is empty.</p>';
  } catch (e) { $('inbox-list').innerHTML = `<div class="alert alert-danger">${e.message}</div>`; }
}

function notifRow(n) {
  const cfg = {
    discount:   { icon: 'bi-percent',         color: 'text-success', label: 'Discount'   },
    ride_ready: { icon: 'bi-taxi-front-fill',  color: 'text-primary', label: 'Ride Ready' },
  };
  const { icon = 'bi-bell', color = 'text-secondary', label = n.type } = cfg[n.type] || {};
  return `
    <div class="card mb-2">
      <div class="card-body py-2 d-flex gap-3 align-items-start">
        <i class="bi ${icon} ${color} notif-icon mt-1"></i>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="badge bg-light text-dark border small">${label}</span>
            <small class="text-muted">${fmtDT(n.createdAt)}</small>
          </div>
          <p class="mb-0 small">${n.message}</p>
        </div>
      </div>
    </div>`;
}

function updateBadge(count) {
  const b = $('notif-badge');
  if (count > 0) { b.textContent = count; b.classList.remove('d-none'); }
  else            { b.classList.add('d-none'); }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Restore session
  const u = localStorage.getItem('user');
  const t = localStorage.getItem('token');
  if (u && t) { state.user = JSON.parse(u); showApp(); navigateTo('overview'); }
  else          { showAuth('login'); }

  // Auth toggles
  $('show-register').addEventListener('click', e => { e.preventDefault(); showAuth('register'); });
  $('show-login').addEventListener('click',    e => { e.preventDefault(); showAuth('login'); });

  // Login
  $('btn-login').addEventListener('click', async () => {
    const email = $('login-email').value.trim();
    const pass  = $('login-password').value;
    $('btn-login').disabled = true;
    try {
      const { user, token } = await api.login(email, pass);
      saveSession(user, token); showApp(); navigateTo('overview');
    } catch (e) { showAlert('login-error', e.message); }
    finally     { $('btn-login').disabled = false; }
  });

  // Enter key on password triggers login
  $('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('btn-login').click();
  });

  // Register
  $('btn-register').addEventListener('click', async () => {
    const fn   = $('reg-firstname').value.trim();
    const ln   = $('reg-lastname').value.trim();
    const email= $('reg-email').value.trim();
    const pass = $('reg-password').value;
    $('btn-register').disabled = true;
    try {
      const { user, token } = await api.register(fn, ln, email, pass);
      saveSession(user, token); showApp(); navigateTo('overview');
    } catch (e) { showAlert('register-error', e.message); }
    finally     { $('btn-register').disabled = false; }
  });

  // Logout
  $('btn-logout').addEventListener('click', () => { clearSession(); showAuth('login'); });

  // Sidebar navigation
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); navigateTo(link.dataset.page); });
  });

  // New booking
  $('btn-get-fare').addEventListener('click', getFarePreview);
  $('btn-create-booking').addEventListener('click', createBooking);

  // Locations
  $('btn-add-location').addEventListener('click', addLocation);
  $('btn-load-weather').addEventListener('click', loadWeather);
});

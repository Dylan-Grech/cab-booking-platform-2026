// Booking routes — create bookings, view current and past rides
// Also contains the two event-driven functions (Task 5: discount, Task 6: cab-ready)
const express = require('express');
const axios = require('axios');
const { db } = require('../config/firebase');

const router = express.Router();

// Prepend https:// when Render injects a bare hostname instead of a full URL
function normalizeUrl(val, fallback) {
  if (!val) return fallback;
  if (val.startsWith('http')) return val;
  return `https://${val}`;
}

const CUSTOMER_SERVICE_URL = normalizeUrl(process.env.CUSTOMER_SERVICE_URL, 'http://localhost:3001');

const CAB_TYPES = ['Economic', 'Premium', 'Executive'];

// Fire-and-forget helper — sends a notification to the customer microservice
async function sendNotification(userId, message, type) {
  try {
    await axios.post(`${CUSTOMER_SERVICE_URL}/api/customers/${userId}/notifications`, { message, type });
  } catch (err) {
    console.error('Failed to send notification:', err.message);
  }
}

// Task 5: Send a discount notification after a user's 3rd booking
// A Firestore transaction is used to guarantee the notification is created only once,
// even if two booking requests arrive at the same time (race condition prevention)
async function checkAndSendDiscount(userId) {
  const snapshot = await db.collection('bookings').where('userId', '==', userId).get();
  if (snapshot.size !== 3) return;

  const flagRef = db.collection('discountFlags').doc(userId);

  // Transaction: read the flag and write it atomically — only one request will succeed
  const sent = await db.runTransaction(async (t) => {
    const flag = await t.get(flagRef);
    if (flag.exists) return false; // already sent, abort
    t.set(flagRef, { userId, createdAt: new Date().toISOString() });
    return true;
  });

  if (!sent) return;

  await sendNotification(
    userId,
    'Congratulations! You have completed 3 rides. You have earned a 10% discount on your next booking!',
    'discount'
  );
}

// Task 6: Notify the user that their cab is ready
// setTimeout simulates the driver search delay (default 3 minutes)
function scheduleCabReadyNotification(userId, booking) {
  const delay = parseInt(process.env.CAB_READY_DELAY_MS) || 3 * 60 * 1000;
  setTimeout(async () => {
    const message =
      `Your cab is ready! Pickup: ${booking.startLocation} → ${booking.endLocation} ` +
      `on ${booking.date} at ${booking.time}. Cab type: ${booking.cabType}.`;
    await sendNotification(userId, message, 'ride_ready');
  }, delay);
}

// POST /api/bookings — create a new booking and trigger event-driven tasks
router.post('/', async (req, res) => {
  try {
    const { userId, startLocation, endLocation, date, time, passengers, cabType } = req.body;

    if (!userId || !startLocation || !endLocation || !date || !time || !passengers || !cabType) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!CAB_TYPES.includes(cabType)) {
      return res.status(400).json({ error: 'cabType must be Economic, Premium, or Executive' });
    }

    if (passengers < 1 || passengers > 8) {
      return res.status(400).json({ error: 'Passengers must be between 1 and 8' });
    }

    const bookingRef = db.collection('bookings').doc();
    const booking = {
      id: bookingRef.id,
      userId,
      startLocation,
      endLocation,
      date,
      time,
      passengers: Number(passengers),
      cabType,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    await bookingRef.set(booking);

    // Fire both event-driven tasks asynchronously so the HTTP response is not delayed
    scheduleCabReadyNotification(userId, booking);
    checkAndSendDiscount(userId).catch(console.error);

    res.status(201).json({ booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/user/:userId/current — bookings on or after today
router.get('/user/:userId/current', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await db
      .collection('bookings')
      .where('userId', '==', req.params.userId)
      .get();

    const bookings = snapshot.docs
      .map(doc => doc.data())
      .filter(b => b.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/user/:userId/past — bookings before today
router.get('/user/:userId/past', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await db
      .collection('bookings')
      .where('userId', '==', req.params.userId)
      .get();

    const bookings = snapshot.docs
      .map(doc => doc.data())
      .filter(b => b.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));

    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/:id — fetch a single booking by ID (used by payment service)
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('bookings').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking: doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

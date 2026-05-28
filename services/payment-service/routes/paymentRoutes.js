const express = require('express');
const axios = require('axios');
const { db } = require('../config/firebase');

const router = express.Router();

function normalizeUrl(val, fallback) {
  if (!val) return fallback;
  if (val.startsWith('http')) return val;
  return `https://${val}`;
}

const FARE_SERVICE_URL    = normalizeUrl(process.env.FARE_SERVICE_URL,    'http://localhost:3004');
const BOOKING_SERVICE_URL = normalizeUrl(process.env.BOOKING_SERVICE_URL, 'http://localhost:3002');

const CAB_MULTIPLIERS = { Economic: 1, Premium: 1.2, Executive: 1.4 };

function getDaytimeMultiplier(time) {
  const [hours] = time.split(':').map(Number);
  return hours >= 8 ? 1 : 1.2; // midnight–8am = 1.2
}

function getPassengersMultiplier(passengers) {
  if (passengers <= 4) return 1;
  if (passengers <= 8) return 2;
  throw new Error('More than 8 passengers is not allowed');
}

// POST /api/payments
router.post('/', async (req, res) => {
  try {
    const { bookingId, userId } = req.body;
    if (!bookingId || !userId) {
      return res.status(400).json({ error: 'bookingId and userId are required' });
    }

    // Check payment doesn't already exist
    const existing = await db.collection('payments').where('bookingId', '==', bookingId).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Payment already processed for this booking' });
    }

    // Fetch booking details
    const bookingRes = await axios.get(`${BOOKING_SERVICE_URL}/api/bookings/${bookingId}`);
    const booking = bookingRes.data.booking;

    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'This booking does not belong to this user' });
    }

    // Fetch base fare from fare estimation service
    const fareRes = await axios.get(`${FARE_SERVICE_URL}/api/fare`, {
      params: { from: booking.startLocation, to: booking.endLocation },
    });
    const cabFare = fareRes.data.fare;

    // Apply multipliers
    const cabMultiplier        = CAB_MULTIPLIERS[booking.cabType];
    const daytimeMultiplier    = getDaytimeMultiplier(booking.time);
    const passengersMultiplier = getPassengersMultiplier(booking.passengers);

    // Check if user has an unused discount (Task 5)
    const discountFlag = await db.collection('discountFlags').doc(userId).get();
    const discountUsed = discountFlag.exists && discountFlag.data().used;
    const discount     = discountFlag.exists && !discountUsed ? 0.9 : 1;

    const totalPrice = parseFloat(
      (cabFare * cabMultiplier * daytimeMultiplier * passengersMultiplier * discount).toFixed(2)
    );

    // Mark discount as used if it was applied
    if (discount === 0.9) {
      await db.collection('discountFlags').doc(userId).update({ used: true });
    }

    // Store payment
    const paymentRef = db.collection('payments').doc();
    const payment = {
      id: paymentRef.id,
      bookingId,
      userId,
      cabFare,
      cabMultiplier,
      daytimeMultiplier,
      passengersMultiplier,
      discountApplied: discount === 0.9,
      discount,
      totalPrice,
      status: 'paid',
      createdAt: new Date().toISOString(),
    };

    await paymentRef.set(payment);
    res.status(201).json({ payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/:bookingId
router.get('/:bookingId', async (req, res) => {
  try {
    const snapshot = await db
      .collection('payments')
      .where('bookingId', '==', req.params.bookingId)
      .get();

    if (snapshot.empty) return res.status(404).json({ error: 'Payment not found' });

    res.json({ payment: snapshot.docs[0].data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

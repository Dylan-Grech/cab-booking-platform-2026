// Payment routes — calculate total fare and store payment records
// Total price = cab_fare × cab_multiplier × daytime_multiplier × passengers_multiplier × discount
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

const FARE_SERVICE_URL    = normalizeUrl(process.env.FARE_SERVICE_URL,    'http://localhost:3004');
const BOOKING_SERVICE_URL = normalizeUrl(process.env.BOOKING_SERVICE_URL, 'http://localhost:3002');

// Multipliers per cab type as defined in the assignment spec
const CAB_MULTIPLIERS = { Economic: 1, Premium: 1.2, Executive: 1.4 };

// Daytime multiplier: night rate (midnight–8am) = 1.2, otherwise 1
function getDaytimeMultiplier(time) {
  const [hours] = time.split(':').map(Number);
  return hours >= 8 ? 1 : 1.2;
}

// Passengers multiplier: 1–4 passengers = 1, 5–8 = 2, >8 not allowed
function getPassengersMultiplier(passengers) {
  if (passengers <= 4) return 1;
  if (passengers <= 8) return 2;
  throw new Error('More than 8 passengers is not allowed');
}

// POST /api/payments — process payment for a confirmed booking
router.post('/', async (req, res) => {
  try {
    const { bookingId, userId } = req.body;
    if (!bookingId || !userId) {
      return res.status(400).json({ error: 'bookingId and userId are required' });
    }

    // Prevent duplicate payments for the same booking
    const existing = await db.collection('payments').where('bookingId', '==', bookingId).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Payment already processed for this booking' });
    }

    // Fetch the booking details from the booking microservice
    const bookingRes = await axios.get(`${BOOKING_SERVICE_URL}/api/bookings/${bookingId}`);
    const booking = bookingRes.data.booking;

    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'This booking does not belong to this user' });
    }

    // Fetch the base fare from the fare estimation microservice (calls RapidAPI internally)
    const fareRes = await axios.get(`${FARE_SERVICE_URL}/api/fare`, {
      params: { from: booking.startLocation, to: booking.endLocation },
    });
    const cabFare = fareRes.data.fare;

    // Apply all multipliers
    const cabMultiplier        = CAB_MULTIPLIERS[booking.cabType];
    const daytimeMultiplier    = getDaytimeMultiplier(booking.time);
    const passengersMultiplier = getPassengersMultiplier(booking.passengers);

    // Check if the user has an unused 10% discount (earned after 3 bookings — Task 5)
    const discountFlag = await db.collection('discountFlags').doc(userId).get();
    const discountUsed = discountFlag.exists && discountFlag.data().used;
    const discount     = discountFlag.exists && !discountUsed ? 0.9 : 1;

    const totalPrice = parseFloat(
      (cabFare * cabMultiplier * daytimeMultiplier * passengersMultiplier * discount).toFixed(2)
    );

    // Mark the discount as used so it can only be applied once
    if (discount === 0.9) {
      await db.collection('discountFlags').doc(userId).update({ used: true });
    }

    // Store the full payment record including all multipliers for audit trail purposes
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

// GET /api/payments/:bookingId — retrieve payment details for a booking
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

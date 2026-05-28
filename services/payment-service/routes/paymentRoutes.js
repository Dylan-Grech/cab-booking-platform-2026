const express = require('express');
const router = express.Router();

// POST /api/payments
router.post('/', async (req, res) => {
  res.json({ message: 'TODO: process payment' });
});

// GET /api/payments/:bookingId
router.get('/:bookingId', async (req, res) => {
  res.json({ message: 'TODO: get payment details' });
});

module.exports = router;

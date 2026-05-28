const express = require('express');
const router = express.Router();

// POST /api/bookings
router.post('/', async (req, res) => {
  res.json({ message: 'TODO: create booking' });
});

// GET /api/bookings/user/:userId/current
router.get('/user/:userId/current', async (req, res) => {
  res.json({ message: 'TODO: get current bookings' });
});

// GET /api/bookings/user/:userId/past
router.get('/user/:userId/past', async (req, res) => {
  res.json({ message: 'TODO: get past bookings' });
});

// GET /api/bookings/:id
router.get('/:id', async (req, res) => {
  res.json({ message: 'TODO: get booking by id' });
});

module.exports = router;

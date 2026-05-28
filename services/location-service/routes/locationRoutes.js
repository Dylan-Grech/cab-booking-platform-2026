const express = require('express');
const router = express.Router();

// POST /api/locations
router.post('/', async (req, res) => {
  res.json({ message: 'TODO: add favourite location' });
});

// GET /api/locations/:userId
router.get('/:userId', async (req, res) => {
  res.json({ message: 'TODO: get favourite locations' });
});

// PUT /api/locations/:id
router.put('/:id', async (req, res) => {
  res.json({ message: 'TODO: update favourite location' });
});

// DELETE /api/locations/:id
router.delete('/:id', async (req, res) => {
  res.json({ message: 'TODO: delete favourite location' });
});

// GET /api/locations/:userId/weather
router.get('/:userId/weather', async (req, res) => {
  res.json({ message: 'TODO: get weather for favourite locations' });
});

module.exports = router;

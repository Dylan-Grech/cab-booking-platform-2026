const express = require('express');
const router = express.Router();

// POST /api/customers/register
router.post('/register', async (req, res) => {
  res.json({ message: 'TODO: register' });
});

// POST /api/customers/login
router.post('/login', async (req, res) => {
  res.json({ message: 'TODO: login' });
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  res.json({ message: 'TODO: get customer' });
});

// GET /api/customers/:id/notifications
router.get('/:id/notifications', async (req, res) => {
  res.json({ message: 'TODO: get notifications' });
});

module.exports = router;

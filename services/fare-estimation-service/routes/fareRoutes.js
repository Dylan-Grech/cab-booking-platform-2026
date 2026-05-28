const express = require('express');
const router = express.Router();

// GET /api/fare?from=...&to=...
router.get('/', async (req, res) => {
  res.json({ message: 'TODO: get fare estimate' });
});

module.exports = router;

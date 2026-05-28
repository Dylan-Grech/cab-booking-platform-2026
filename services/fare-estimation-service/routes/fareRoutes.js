const express = require('express');
const axios = require('axios');

const router = express.Router();

// Deterministic distance estimate from two location strings (fallback only)
function estimateDistance(from, to) {
  const str = (from + to).toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return 3 + (Math.abs(hash) % 23); // 3–25 km (realistic for Malta)
}

async function getFareFromAPI(from, to) {
  const response = await axios.get('https://taxi-fare-calculator.p.rapidapi.com/v1/estimate', {
    params: { source: from, destination: to, currency: 'EUR' },
    headers: {
      'x-rapidapi-host': 'taxi-fare-calculator.p.rapidapi.com',
      'x-rapidapi-key': process.env.RAPIDAPI_KEY,
    },
    timeout: 5000,
  });
  // Extract the numeric fare from the API response
  const fare = response.data?.fare ?? response.data?.price ?? response.data?.total;
  if (!fare) throw new Error('Unexpected API response shape');
  return { fare: parseFloat(fare), source: 'api', distanceKm: response.data?.distance ?? null };
}

// GET /api/fare?from=Valletta&to=Sliema
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: '"from" and "to" query params are required' });

    const hasKey = process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY !== 'your_rapidapi_key_here';

    if (hasKey) {
      try {
        const result = await getFareFromAPI(from, to);
        return res.json(result);
      } catch (apiErr) {
        console.warn('RapidAPI call failed, using fallback:', apiErr.message);
      }
    }

    // Fallback: formula-based estimate
    const distanceKm = estimateDistance(from, to);
    const fare = parseFloat((3.0 + distanceKm * 0.8).toFixed(2));
    res.json({ fare, distanceKm, source: 'fallback' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

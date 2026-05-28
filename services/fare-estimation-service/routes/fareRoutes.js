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
  return 3 + (Math.abs(hash) % 23); // 3–25 km
}

// Geocode a place name → { lat, lng } using OpenStreetMap Nominatim (free, no key)
async function geocode(place) {
  const res = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: place, format: 'json', limit: 1 },
    headers: { 'User-Agent': 'CabGo-Assignment/1.0' },
    timeout: 5000,
  });
  if (!res.data.length) throw new Error(`Could not geocode location: "${place}"`);
  return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
}

async function getFareFromAPI(from, to) {
  const [dep, arr] = await Promise.all([geocode(from), geocode(to)]);

  const response = await axios.get('https://taxi-fare-calculator.p.rapidapi.com/search-geo', {
    params: {
      dep_lat: dep.lat.toFixed(5),
      dep_lng: dep.lng.toFixed(5),
      arr_lat: arr.lat.toFixed(5),
      arr_lng: arr.lng.toFixed(5),
    },
    headers: {
      'x-rapidapi-host': 'taxi-fare-calculator.p.rapidapi.com',
      'x-rapidapi-key': process.env.RAPIDAPI_KEY,
    },
    timeout: 8000,
  });

  const journey = response.data?.journey;
  if (!journey) throw new Error('Unexpected API response: ' + JSON.stringify(response.data).slice(0, 200));

  const dayFare = journey.fares?.find(f => f.name === 'by Day');
  const cents   = dayFare?.price_in_cents;
  if (!cents || cents === 'n/a') throw new Error('Fare not available for this route');

  return {
    fare: parseFloat((cents / 100).toFixed(2)),
    distanceKm: journey.distance ?? null,
    source: 'api',
  };
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

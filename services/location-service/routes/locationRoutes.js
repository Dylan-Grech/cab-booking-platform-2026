const express = require('express');
const axios = require('axios');
const { db } = require('../config/firebase');

const router = express.Router();

async function getWeather(location) {
  const hasKey = process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY !== 'your_rapidapi_key_here';

  if (hasKey) {
    try {
      const response = await axios.get('https://weatherapi-com.p.rapidapi.com/current.json', {
        params: { q: location },
        headers: {
          'x-rapidapi-host': 'weatherapi-com.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        },
        timeout: 5000,
      });
      const { temp_c, condition, humidity, wind_kph, feelslike_c } = response.data.current;
      return {
        temperatureC: temp_c,
        feelsLikeC: feelslike_c,
        condition: condition.text,
        icon: condition.icon,
        humidity,
        windKph: wind_kph,
        source: 'api',
      };
    } catch (err) {
      console.warn(`Weather API failed for "${location}":`, err.message);
    }
  }

  // Fallback: simulated weather
  return {
    temperatureC: 22,
    feelsLikeC: 21,
    condition: 'Partly cloudy',
    icon: null,
    humidity: 65,
    windKph: 15,
    source: 'fallback',
  };
}

// POST /api/locations
router.post('/', async (req, res) => {
  try {
    const { userId, name, address } = req.body;
    if (!userId || !name || !address) {
      return res.status(400).json({ error: 'userId, name, and address are required' });
    }

    const ref = db.collection('locations').doc();
    const location = {
      id: ref.id,
      userId,
      name,
      address,
      createdAt: new Date().toISOString(),
    };

    await ref.set(location);
    res.status(201).json({ location });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/locations/:userId/weather  — must come before /:userId
router.get('/:userId/weather', async (req, res) => {
  try {
    const snapshot = await db
      .collection('locations')
      .where('userId', '==', req.params.userId)
      .get();

    if (snapshot.empty) return res.json({ weatherData: [] });

    const results = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const loc = doc.data();
        const weather = await getWeather(loc.address);
        return { location: loc, weather };
      })
    );

    res.json({ weatherData: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/locations/:userId
router.get('/:userId', async (req, res) => {
  try {
    const snapshot = await db
      .collection('locations')
      .where('userId', '==', req.params.userId)
      .get();

    const locations = snapshot.docs.map(doc => doc.data());
    res.json({ locations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/locations/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name && !address) {
      return res.status(400).json({ error: 'Provide at least name or address to update' });
    }

    const ref = db.collection('locations').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Location not found' });

    const updates = {};
    if (name)    updates.name    = name;
    if (address) updates.address = address;

    await ref.update(updates);
    const updated = (await ref.get()).data();
    res.json({ location: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/locations/:id
router.delete('/:id', async (req, res) => {
  try {
    const ref = db.collection('locations').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Location not found' });

    await ref.delete();
    res.json({ message: 'Location deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

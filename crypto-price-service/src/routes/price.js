const express = require('express');
const { fetchPrice, getHistory } = require('../services/cryptoApi');

const router = express.Router();

router.get('/price/:coinId', async (req, res) => {
  const { coinId } = req.params;
  try {
    const price = await fetchPrice(coinId);
    res.json({ coinId, price, currency: 'usd' });
  } catch (error) {
    const status = error.response?.status === 404 ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/history', (req, res) => {
  res.json(getHistory());
});

module.exports = router;

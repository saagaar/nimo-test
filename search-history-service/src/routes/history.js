const express = require('express');
const axios = require('axios');
const { SERVICE_URLS } = require('../../../shared/constants');

const router = express.Router();
const baseUrl = process.env.CRYPTO_PRICE_SERVICE_URL || SERVICE_URLS.CRYPTO_PRICE;
const PRICE_SERVICE_URL = `${baseUrl}/history`;

router.get('/history', async (req, res) => {
  try {
    const { data } = await axios.get(PRICE_SERVICE_URL);
    res.json(data);
  } catch {
    res.status(503).json({ error: 'crypto-price-service unavailable' });
  }
});

module.exports = router;

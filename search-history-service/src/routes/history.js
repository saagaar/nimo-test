const express = require('express');
// const axios = require('axios');
const router = express.Router();

router.get('/history', async (req, res) => {
  try {
    // res.json(data);
  } catch {
    res.status(503).json({ error: 'crypto-price-service unavailable' });
  }
});

module.exports = router;

const axios = require('axios');
const { COINGECKO_BASE_URL } = require('../../../shared/constants');

const COINGECKO_URL = `${COINGECKO_BASE_URL}/simple/price`;
const searchHistory = [];

async function fetchPrice(coinId) {
  const { data } = await axios.get(COINGECKO_URL, {
    params: { ids: coinId, vs_currencies: 'usd' },
  });

  if (!data[coinId]) {
    const err = new Error(`Coin "${coinId}" not found`);
    err.response = { status: 404 };
    throw err;
  }

  const price = data[coinId].usd;
  searchHistory.push({ coinId, price, timestamp: new Date().toISOString() });
  return price;
}

function getHistory() {
  return searchHistory;
}

module.exports = { fetchPrice, getHistory };

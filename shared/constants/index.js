const PORTS = {
  CRYPTO_PRICE_SERVICE: 3001,
  SEARCH_HISTORY_SERVICE: 3002,
};

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

const SERVICE_URLS = {
  CRYPTO_PRICE: `http://localhost:${PORTS.CRYPTO_PRICE_SERVICE}`,
};

module.exports = { PORTS, COINGECKO_BASE_URL, SERVICE_URLS };

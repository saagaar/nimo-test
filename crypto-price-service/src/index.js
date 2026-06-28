const express = require('express');
const { PORTS } = require('#shared/constants');
const priceRouter = require('./routes/price');

const app = express();
const PORT = PORTS.CRYPTO_PRICE_SERVICE;

app.use(express.json());
app.use('/', priceRouter);

app.listen(PORT, () => {
  console.log(`crypto-price-service running on http://localhost:${PORT}`);
});

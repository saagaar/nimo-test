const express = require('express');
const { PORTS } = require('../../shared/constants');
const historyRouter = require('./routes/history');

const app = express();
const PORT = PORTS.SEARCH_HISTORY_SERVICE;

app.use(express.json());
app.use('/', historyRouter);

app.listen(PORT, () => {
  console.log(`search-history-service running on http://localhost:${PORT}`);
});

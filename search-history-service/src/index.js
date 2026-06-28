const express = require('express');
const historyRouter = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/', historyRouter);

app.listen(PORT, () => {
  console.log(`search-history-service running on http://localhost:${PORT}`);
});

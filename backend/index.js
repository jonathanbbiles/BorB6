require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { placeLimitBuyThenSell } = require('./trade');

const app = express();
app.use(express.json());

const ALPACA_BASE_URL = 'https://paper-api.alpaca.markets/v2';
const API_KEY = process.env.ALPACA_API_KEY;
const SECRET_KEY = process.env.ALPACA_SECRET_KEY;

const HEADERS = {
  'APCA-API-KEY-ID': API_KEY,
  'APCA-API-SECRET-KEY': SECRET_KEY,
};

// Sequentially place a limit buy order followed by a delayed limit sell once filled
app.post('/trade', async (req, res) => {
  const { symbol } = req.body;
  try {
    const result = await placeLimitBuyThenSell(symbol);
    res.json(result);
  } catch (err) {
    console.error('Trade error:', err?.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// Proxy all other Alpaca requests through this backend
app.use('/alpaca', async (req, res) => {
  const url = `${ALPACA_BASE_URL}${req.path}`;
  try {
    const response = await axios({
      method: req.method,
      url,
      params: req.query,
      data: req.body,
      headers: HEADERS,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json(err.response?.data || { error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});


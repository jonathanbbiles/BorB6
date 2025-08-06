require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { placeLimitBuyThenSell } = require('./trade');

const app = express();
app.use(express.json());

const ALPACA_BASE_URL = process.env.ALPACA_BASE_URL;

const headers = {
  'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
  'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
  'Content-Type': 'application/json',
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
      headers,
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
  console.log('Alpaca BASE URL:', process.env.ALPACA_BASE_URL);
  console.log('Alpaca API KEY starts with:', process.env.ALPACA_API_KEY?.slice(0, 4));
});


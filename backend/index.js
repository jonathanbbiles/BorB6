require('dotenv').config();
const express = require('express');
const alpaca = require('./alpacaClient');
const { placeLimitBuyThenSell } = require('./trade');

const app = express();
app.use(express.json());

// Sequentially place a limit buy order followed by a delayed limit sell once filled
app.post('/trade', async (req, res) => {
  const { symbol } = req.body;
  try {
    const result = await placeLimitBuyThenSell(symbol);
    res.json(result);
  } catch (err) {
    console.error('Trade error:', err?.response?.data || err.message);
    if (err.response?.status === 403) {
      res
        .status(403)
        .json({
          error:
            'Access Denied – check Alpaca API keys and endpoint (paper vs live).',
        });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Proxy all other Alpaca requests through this backend
app.use('/alpaca', async (req, res) => {
  console.log(`[Alpaca] ${req.method} ${req.path}`);
  try {
    const response = await alpaca({
      method: req.method,
      url: req.path,
      params: req.query,
      data: req.body,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    if (status === 403) {
      res.status(403).json({
        error:
          'Access Denied – check Alpaca API keys and endpoint (paper vs live).',
      });
    } else {
      res.status(status).json(err.response?.data || { error: err.message });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('Alpaca BASE URL:', process.env.ALPACA_BASE_URL);
  console.log('Alpaca API KEY starts with:', process.env.ALPACA_API_KEY?.slice(0, 4));
});


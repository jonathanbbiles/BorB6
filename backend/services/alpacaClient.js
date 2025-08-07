const axios = require('axios');
require('dotenv').config();

const client = axios.create({
  baseURL: process.env.ALPACA_BASE_URL,
  headers: {
    'APCA-API-KEY-ID': process.env.ALPACA_KEY,
    'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET
  }
});

const getCryptoAssets = async () => {
  const res = await client.get('/v2/assets');
  return res.data.filter(a => a.class === 'crypto' && a.status === 'active');
};

const getBars = async (symbol, timeframe = '1Min', limit = 100) => {
  const res = await client.get(`/v2/stocks/${symbol}/bars`, {
    params: { timeframe, limit }
  });
  return res.data.bars;
};

const placeOrder = async (order) => {
  return client.post('/v2/orders', order);
};

module.exports = { getCryptoAssets, getBars, placeOrder };

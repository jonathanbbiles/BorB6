require('dotenv').config();
const axios = require('axios');

const alpaca = axios.create({
  baseURL: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
  headers: {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
    'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
    'Content-Type': 'application/json',
  },
});

alpaca.interceptors.response.use(
  (res) => {
    const method = res.config.method?.toUpperCase();
    const url = res.config.url;
    console.log(`[Alpaca] ${method} ${url} -> ${res.status}`);
    return res;
  },
  (err) => {
    const method = err.config?.method?.toUpperCase();
    const url = err.config?.url;
    const status = err.response?.status || 'ERR';
    console.log(`[Alpaca] ${method} ${url} -> ${status}`);
    return Promise.reject(err);
  }
);

module.exports = alpaca;

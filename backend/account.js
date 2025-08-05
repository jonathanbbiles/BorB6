require('dotenv').config();
const axios = require('axios');

const ALPACA_BASE_URL = process.env.ALPACA_BASE_URL;

const headers = {
  'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
  'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
};

// Debug credentials on startup (remove once verified)
console.log('Alpaca BASE URL:', process.env.ALPACA_BASE_URL);
console.log('API KEY starts with:', process.env.ALPACA_API_KEY?.slice(0, 5));

async function getAccountInfo() {
  const res = await axios.get(`${ALPACA_BASE_URL}/v2/account`, { headers });
  const portfolioValue = parseFloat(res.data.portfolio_value);
  const buyingPower = parseFloat(res.data.buying_power);
  return {
    portfolioValue: isNaN(portfolioValue) ? 0 : portfolioValue,
    buyingPower: isNaN(buyingPower) ? 0 : buyingPower,
  };
}

module.exports = { getAccountInfo };


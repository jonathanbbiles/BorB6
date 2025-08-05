require('dotenv').config();
const axios = require('axios');

const ALPACA_BASE_URL = process.env.ALPACA_BASE_URL;
const API_KEY = process.env.ALPACA_API_KEY;
const SECRET_KEY = process.env.ALPACA_SECRET_KEY;

const HEADERS = {
  'APCA-API-KEY-ID': API_KEY,
  'APCA-API-SECRET-KEY': SECRET_KEY,
};

async function getAccountInfo() {
  const res = await axios.get(`${ALPACA_BASE_URL}/v2/account`, { headers: HEADERS });
  const portfolioValue = parseFloat(res.data.portfolio_value);
  const buyingPower = parseFloat(res.data.buying_power);
  return {
    portfolioValue: isNaN(portfolioValue) ? 0 : portfolioValue,
    buyingPower: isNaN(buyingPower) ? 0 : buyingPower,
  };
}

module.exports = { getAccountInfo };


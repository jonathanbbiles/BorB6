require('dotenv').config();
const axios = require('axios');

const ALPACA_BASE_URL = process.env.ALPACA_BASE_URL;

const headers = {
  'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
  'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
};

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


require('dotenv').config();
const axios = require('axios');

async function getAccountInfo() {
  const res = await axios.get(`${process.env.ALPACA_BASE_URL}/v2/account`, {
    headers: {
      'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
    },
  });
  const data = res.data;
  return {
    buyingPower: parseFloat(data.buying_power),
    portfolioValue: parseFloat(data.portfolio_value),
  };
}

module.exports = { getAccountInfo };


const alpaca = require('./alpacaClient');

async function getAccountInfo() {
  const res = await alpaca.get('/v2/account');
  const data = res.data;
  return {
    buyingPower: parseFloat(data.buying_power),
    portfolioValue: parseFloat(data.portfolio_value),
  };
}

module.exports = { getAccountInfo };


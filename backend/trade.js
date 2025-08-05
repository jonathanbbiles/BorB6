require('dotenv').config();
const axios = require('axios');
const { getAccountInfo } = require('./account');

const ALPACA_BASE_URL = process.env.ALPACA_BASE_URL;
const DATA_URL = process.env.ALPACA_DATA_URL;
const API_KEY = process.env.ALPACA_API_KEY;
const SECRET_KEY = process.env.ALPACA_SECRET_KEY;

const HEADERS = {
  'APCA-API-KEY-ID': API_KEY,
  'APCA-API-SECRET-KEY': SECRET_KEY,
};

// Offsets taker fees when calculating profit target
const FEE_BUFFER = 0.0025; // 0.25% taker fee
const TARGET_PROFIT = 0.005; // 0.5% desired profit
const TOTAL_MARKUP = FEE_BUFFER + TARGET_PROFIT;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function roundQty(qty) {
  return parseFloat(Number(qty).toFixed(8));
}

function roundPrice(price) {
  return parseFloat(Number(price).toFixed(2));
}

// Fetch latest trade price for a symbol
async function getLatestPrice(symbol) {
  const res = await axios.get(
    `${DATA_URL}/crypto/latest/trades?symbols=${symbol}`,
    { headers: HEADERS }
  );
  const trade = res.data.trades && res.data.trades[symbol];
  if (!trade) throw new Error(`Price not available for ${symbol}`);
  return parseFloat(trade.p);
}

// Limit buy using 10% of portfolio value then place a delayed limit sell with markup
async function placeLimitBuyThenSell(symbol) {
  const [price, account] = await Promise.all([
    getLatestPrice(symbol),
    getAccountInfo(),
  ]);

  const targetTradeAmount = account.portfolioValue * 0.1;
  const amountToSpend = Math.min(targetTradeAmount, account.buyingPower);

  if (amountToSpend < 10) {
    throw new Error('Insufficient buying power for trade');
  }

  const qty = roundQty(amountToSpend / price);
  if (qty <= 0) {
    throw new Error('Insufficient buying power for trade');
  }

  const buyRes = await axios.post(
    `${ALPACA_BASE_URL}/v2/orders`,
    {
      symbol,
      qty,
      side: 'buy',
      type: 'limit',
      time_in_force: 'gtc',
      limit_price: price,
    },
    { headers: HEADERS }
  );

  const buyOrder = buyRes.data;

  let filled = buyOrder;
  for (let i = 0; i < 20; i++) {
    const chk = await axios.get(`${ALPACA_BASE_URL}/v2/orders/${buyOrder.id}`, {
      headers: HEADERS,
    });
    filled = chk.data;
    if (filled.status === 'filled') break;
    await sleep(3000);
  }

  if (filled.status !== 'filled') {
    throw new Error('Buy order not filled in time');
  }

  // Wait 10 seconds before selling
  await sleep(10000);

  const limitPrice = roundPrice(
    parseFloat(filled.filled_avg_price) * (1 + TOTAL_MARKUP)
  );

  const sellRes = await axios.post(
    `${ALPACA_BASE_URL}/v2/orders`,
    {
      symbol,
      qty: filled.filled_qty,
      side: 'sell',
      type: 'limit',
      time_in_force: 'gtc',
      limit_price: limitPrice,
    },
    { headers: HEADERS }
  );

  return { buy: filled, sell: sellRes.data };
}

module.exports = {
  placeLimitBuyThenSell,
};


require('dotenv').config();
const axios = require('axios');
const { getAccountInfo } = require('./account');

const ALPACA_BASE_URL = process.env.ALPACA_BASE_URL;

const headers = {
  'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
  'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
  'Content-Type': 'application/json',
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

const COINGECKO_IDS = {
  BTCUSD: 'bitcoin',
  ETHUSD: 'ethereum',
  LTCUSD: 'litecoin',
  SOLUSD: 'solana',
  DOGEUSD: 'dogecoin',
};

// Fetch latest trade price for a symbol with Alpaca and CoinGecko fallback
async function getLatestPrice(symbol) {
  const url = `https://data.alpaca.markets/v1beta1/crypto/latest/trades?symbols=${symbol}`;
  try {
    const res = await axios.get(url, { headers });
    const trade = res.data.trades && res.data.trades[symbol];
    if (trade && trade.p) return parseFloat(trade.p);
    throw new Error('No trade data');
  } catch (err) {
    console.error('Alpaca price fetch failed', err.response?.data || err.message);
    const id = COINGECKO_IDS[symbol];
    if (!id) throw new Error(`Price not available for ${symbol}`);
    try {
      const cgRes = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
      );
      const price = cgRes.data[id]?.usd;
      if (price) return parseFloat(price);
    } catch (cgErr) {
      console.error('CoinGecko price fetch failed', cgErr.response?.data || cgErr.message);
    }
    throw new Error(`Price not available for ${symbol}`);
  }
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

  console.log('[TRADE] BUY INITIATED', { symbol, qty, price });
  console.log('[HEADERS]', {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY?.slice(0, 6),
    BASE_URL: process.env.ALPACA_BASE_URL,
  });

  let orderData = {
    symbol: String(symbol),
    qty: String(qty),
    side: 'buy',
    type: 'limit',
    time_in_force: 'gtc',
    limit_price: String(price),
  };
  console.log('[BUY ORDER]', JSON.stringify(orderData));

  const buyRes = await axios.post(
    `${ALPACA_BASE_URL}/v2/orders`,
    orderData,
    { headers }
  );

  const buyOrder = buyRes.data;

  let filled = buyOrder;
  for (let i = 0; i < 20; i++) {
    const chk = await axios.get(`${ALPACA_BASE_URL}/v2/orders/${buyOrder.id}`, {
      headers,
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

  orderData = {
    symbol: String(symbol),
    qty: String(filled.filled_qty),
    side: 'sell',
    type: 'limit',
    time_in_force: 'gtc',
    limit_price: String(limitPrice),
  };
  console.log('[SELL ORDER]', JSON.stringify(orderData));

  const sellRes = await axios.post(
    `${ALPACA_BASE_URL}/v2/orders`,
    orderData,
    { headers }
  );

  return { buy: filled, sell: sellRes.data };
}

module.exports = {
  placeLimitBuyThenSell,
};


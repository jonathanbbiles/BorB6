const { getCryptoAssets, getBars, placeOrder } = require('./alpacaClient');
const { calculateIndicators } = require('./indicators');
const fs = require('fs');
const statePath = './data/state.json';

const loadState = () => JSON.parse(fs.readFileSync(statePath, 'utf8'));
const saveState = (state) => fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

const executeStrategy = async () => {
  const assets = await getCryptoAssets();
  const state = loadState();
  const results = [];

  for (const asset of assets) {
    const symbol = asset.symbol;
    const bars = await getBars(symbol);
    if (!bars || bars.length < 30) continue;

    const closes = bars.map(b => b.c);
    const { macd, histogramSlope, rsi } = calculateIndicators(closes);

    if (!macd || histogramSlope === undefined) continue;

    const isMomentum = macd.MACD > macd.signal && histogramSlope > 0.04 && rsi > 35;

    if (isMomentum && !state.cooldowns?.[symbol]) {
      const currentPrice = closes[closes.length - 1];
      const limitPrice = (currentPrice * 0.999).toFixed(2);
      const sellPrice = (currentPrice * 1.0125).toFixed(2);
      const stopPrice = (currentPrice * 0.975).toFixed(2);

      const order = {
        symbol,
        qty: 1,
        side: 'buy',
        type: 'limit',
        time_in_force: 'gtc',
        limit_price: limitPrice
      };

      await placeOrder(order);

      state.cooldowns = state.cooldowns || {};
      state.cooldowns[symbol] = Date.now() + 30 * 60 * 1000; // 30 min cooldown
      results.push({ symbol, action: 'BUY', limitPrice, sellPrice, stopPrice });
    }
  }

  saveState(state);
  return results;
};

module.exports = { executeStrategy };

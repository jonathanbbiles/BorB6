const { MACD, RSI } = require('technicalindicators');

function calculateIndicators(closes) {
  const macd = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
  const rsi = RSI.calculate({ values: closes, period: 14 });

  return {
    macd: macd.slice(-1)[0],
    histogramSlope: macd.length > 1 ? macd[macd.length - 1].histogram - macd[macd.length - 2].histogram : 0,
    rsi: rsi.slice(-1)[0] || 50
  };
}

module.exports = { calculateIndicators };

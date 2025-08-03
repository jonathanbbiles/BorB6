import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Switch,
} from 'react-native';

const ALPACA_KEY = 'AKP4CYCLABN0QHC7GVH4';
const ALPACA_SECRET = 'PwJAEwLnLnsf7qAVvFutE8VIMgsAgvi7PMkMcCca';
const ALPACA_BASE_URL = 'https://api.alpaca.markets';

const HEADERS = {
  'APCA-API-KEY-ID': ALPACA_KEY,
  'APCA-API-SECRET-KEY': ALPACA_SECRET,
  'Content-Type': 'application/json',
};

const FEE_BUFFER = 0.0025;
const TARGET_PROFIT = 0.0005;
const TOTAL_MARKUP = FEE_BUFFER + TARGET_PROFIT;
const CRYPTO_TIME_IN_FORCE = 'gtc';

const TOKENS = [
  { name: 'BTC/USD', symbol: 'BTCUSD', cc: 'BTC' },
  { name: 'ETH/USD', symbol: 'ETHUSD', cc: 'ETH' },
  { name: 'SOL/USD', symbol: 'SOLUSD', cc: 'SOL' },
  { name: 'LTC/USD', symbol: 'LTCUSD', cc: 'LTC' },
  { name: 'BCH/USD', symbol: 'BCHUSD', cc: 'BCH' },
  { name: 'DOGE/USD', symbol: 'DOGEUSD', cc: 'DOGE' },
  { name: 'AVAX/USD', symbol: 'AVAXUSD', cc: 'AVAX' },
  { name: 'ADA/USD', symbol: 'ADAUSD', cc: 'ADA' },
  { name: 'AAVE/USD', symbol: 'AAVEUSD', cc: 'AAVE' },
  { name: 'UNI/USD', symbol: 'UNIUSD', cc: 'UNI' },
  { name: 'MATIC/USD', symbol: 'MATICUSD', cc: 'MATIC' },
  { name: 'LINK/USD', symbol: 'LINKUSD', cc: 'LINK' },
  { name: 'SHIB/USD', symbol: 'SHIBUSD', cc: 'SHIB' },
  { name: 'XRP/USD', symbol: 'XRPUSD', cc: 'XRP' },
  { name: 'USDT/USD', symbol: 'USDTUSD', cc: 'USDT' },
  { name: 'USDC/USD', symbol: 'USDCUSD', cc: 'USDC' },
  { name: 'TRX/USD', symbol: 'TRXUSD', cc: 'TRX' },
  { name: 'ETC/USD', symbol: 'ETCUSD', cc: 'ETC' },
];

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const calcEMA = (data, period) => {
  const k = 2 / (period + 1);
  let ema = data[0];
  return data.map((price) => {
    ema = price * k + ema * (1 - k);
    return ema;
  });
};

const calcMACD = (data) => {
  const shortEMA = calcEMA(data, 12);
  const longEMA = calcEMA(data, 26);
  const macdLine = shortEMA.map((val, i) => val - longEMA[i]);
  const signalLine = calcEMA(macdLine, 9);
  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    histogram: macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1],
    slope: macdLine.slice(-5).reduce((a, b, i, arr) => (i ? a + b - arr[i - 1] : 0), 0) / 5,
  };
};

const calcRSI = (closes, period = 14) => {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gains += delta;
    else losses -= delta;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

const calcZScore = (arr) => {
  const mean = arr.reduce((a, b) => a + b) / arr.length;
  const std = Math.sqrt(arr.map((x) => (x - mean) ** 2).reduce((a, b) => a + b) / arr.length);
  const last = arr[arr.length - 1];
  return (last - mean) / std;
};

const getOpenOrders = async (symbol) => {
  try {
    const res = await fetch(`${ALPACA_BASE_URL}/orders?status=open`, {
      headers: HEADERS,
    });
    const orders = await res.json();
    return orders.filter((o) => o.symbol === symbol);
  } catch (err) {
    console.warn('Open order fetch failed:', err);
    return [];
  }
};
const getPosition = async (symbol) => {
  try {
    const res = await fetch(`${ALPACA_BASE_URL}/positions/${symbol}`, {
      headers: HEADERS,
    });
    if (!res.ok) return null;
    const pos = await res.json();
    return {
      qty: parseFloat(pos.qty),
      basis: parseFloat(pos.avg_entry_price),
      available: parseFloat(pos.qty_available || pos.qty),
    };
  } catch {
    return null;
  }
};

const placeLimitSell = async (symbol) => {
  const pos = await getPosition(symbol);
  if (!pos || pos.available * pos.basis < 1) return;
  const limit_price = (pos.basis * (1 + TOTAL_MARKUP)).toFixed(5);
  const order = {
    symbol,
    qty: pos.available,
    side: 'sell',
    type: 'limit',
    time_in_force: CRYPTO_TIME_IN_FORCE,
    limit_price,
  };
  try {
    const res = await fetch(`${ALPACA_BASE_URL}/orders`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(order),
    });
    const json = await res.json();
    console.log('[SELL]', symbol, json);
  } catch (err) {
    console.warn('[SELL FAILED]', err);
  }
};

const placeOrder = async (symbol, ccSymbol, mode) => {
  const open = await getOpenOrders(symbol);
  if (open.length) return;
  const pos = await getPosition(symbol);
  if (pos && pos.available * pos.basis > 1) return;

  try {
    const priceRes = await fetch(
      `https://min-api.cryptocompare.com/data/price?fsym=${ccSymbol}&tsyms=USD`
    );
    const { USD: price } = await priceRes.json();
    if (!price || isNaN(price)) return;

    const acctRes = await fetch(`${ALPACA_BASE_URL}/account`, {
      headers: HEADERS,
    });
    const acct = await acctRes.json();
    const cash = parseFloat(acct.cash || 0);
    const portVal = parseFloat(acct.portfolio_value || 0);
    let allocation = Math.min(cash, portVal * 0.1);
    allocation = Math.floor(allocation * 100) / 100;
    if (allocation < 1) return;

    const order = {
      symbol,
      notional: allocation,
      side: 'buy',
      type: 'market',
      time_in_force: CRYPTO_TIME_IN_FORCE,
    };

    const res = await fetch(`${ALPACA_BASE_URL}/orders`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(order),
    });
    const json = await res.json();
    console.log(`[BUY ${mode}]`, symbol, json);
    if (json.id) {
      setTimeout(() => placeLimitSell(symbol), 5000);
    }
  } catch (err) {
    console.warn('[BUY FAILED]', symbol, err);
  }
};

export default function App() {
  const [data, setData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const intervalRef = useRef();

  const loadData = async () => {
    const results = [];
    for (const token of TOKENS) {
      const result = {
        ...token,
        price: null,
        rsi: null,
        macd: null,
        signal: null,
        mode: '❓',
        entryReady: false,
      };
      try {
        const [priceRes, histoRes] = await Promise.all([
          fetch(`https://min-api.cryptocompare.com/data/price?fsym=${token.cc}&tsyms=USD`),
          fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${token.cc}&tsym=USD&limit=60&aggregate=5`),
        ]);
        const priceData = await priceRes.json();
        const histoData = await histoRes.json();
        const closes = histoData?.Data?.Data?.map((d) => d.close).filter((n) => typeof n === 'number');
        result.price = priceData.USD;

        if (closes?.length >= 30) {
          const macd = calcMACD(closes);
          const rsi = calcRSI(closes);
          const zscore = calcZScore(closes);

          result.rsi = rsi?.toFixed(1);
          result.macd = macd.macd;
          result.signal = macd.signal;

          // 🧠 Momentum Mode
          if (macd.macd > macd.signal && macd.macd - macd.signal > 0.02) {
            result.entryReady = true;
            result.mode = '📈';
            await placeOrder(token.symbol, token.cc, 'momentum');
          }
          // 🧠 Reversion Mode
          else if (macd.macd > macd.signal && zscore < -2 && macd.histogram > 0) {
            result.entryReady = true;
            result.mode = '📉';
            await placeOrder(token.symbol, token.cc, 'reversion');
          }
        }
      } catch (err) {
        console.warn('Data fetch failed for', token.symbol);
      }
      results.push(result);
    }
    setData(results);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 60000);
    return () => clearInterval(intervalRef.current);
  }, []);
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderCard = (asset) => {
    const borderColor = asset.entryReady ? 'green' : 'gray';
    return (
      <View key={asset.symbol} style={[styles.card, { borderLeftColor: borderColor }]}>
        <Text style={styles.symbol}>
          {asset.name} ({asset.symbol})
        </Text>
        {asset.entryReady && <Text style={styles.entryReady}>✅ ENTRY READY {asset.mode}</Text>}
        {asset.price != null && <Text>Price: ${asset.price}</Text>}
        {asset.rsi != null && <Text>RSI: {asset.rsi}</Text>}
        <Text>MACD: {asset.macd?.toFixed(5) ?? '—'}</Text>
        <Text>Signal: {asset.signal?.toFixed(5) ?? '—'}</Text>
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, darkMode && styles.containerDark]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.row}>
        <Text style={[styles.title, darkMode && styles.titleDark]}>🎭 Bullish or Bust!</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>
      {data.map(renderCard)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 40,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  titleDark: {
    color: '#fff',
  },
  card: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 5,
    marginBottom: 10,
  },
  symbol: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#005eff',
  },
  entryReady: {
    color: 'green',
    fontWeight: 'bold',
    marginBottom: 4,
  },
});

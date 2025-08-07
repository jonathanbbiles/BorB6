from alpaca_client import alpaca, get_latest_price, get_crypto_assets
from utils import calculate_macd, calculate_rsi, calculate_zscore
import pandas as pd
import time

cooldown_tracker = {}

def fetch_data(symbol):
    bars = alpaca.get_crypto_bars(symbol, timeframe="1Min", limit=60).df
    return bars[bars.symbol == symbol]

def evaluate_momentum(df):
    macd, signal, histogram = calculate_macd(df)
    rsi = calculate_rsi(df)
    slope = histogram.diff().iloc[-1]
    return (macd.iloc[-1] > signal.iloc[-1] and slope > 0.04)

def evaluate_reversion(df):
    macd, signal, histogram = calculate_macd(df)
    z = calculate_zscore(df["close"])
    slope = histogram.diff().iloc[-1]
    return (macd.iloc[-1] > signal.iloc[-1] and z.iloc[-1] < -2 and slope > 0)

def place_trade(symbol):
    if cooldown_tracker.get(symbol, 0) > time.time():
        return

    df = fetch_data(symbol)
    if df.empty:
        return

    price = get_latest_price(symbol)
    qty = calculate_qty(symbol, price)
    limit_price = round(price * 0.999, 2)
    take_profit = round(price * 1.0125, 2)
    stop_loss = round(price * 0.975, 2)

    if evaluate_momentum(df) or evaluate_reversion(df):
        alpaca.submit_order(
            symbol=symbol,
            qty=qty,
            side="buy",
            type="limit",
            time_in_force="gtc",
            limit_price=limit_price
        )
        alpaca.submit_order(
            symbol=symbol,
            qty=qty,
            side="sell",
            type="limit",
            time_in_force="gtc",
            limit_price=take_profit
        )
        cooldown_tracker[symbol] = time.time() + 1800

def calculate_qty(symbol, price):
    account = alpaca.get_account()
    cash = float(account.cash) * 0.1 * 0.97
    return round(cash / price, 4)

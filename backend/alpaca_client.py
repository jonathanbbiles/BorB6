from alpaca_trade_api.rest import REST
from config import ALPACA_API_KEY, ALPACA_SECRET_KEY, ALPACA_BASE_URL

alpaca = REST(
    key_id=ALPACA_API_KEY,
    secret_key=ALPACA_SECRET_KEY,
    base_url=ALPACA_BASE_URL
)

def get_crypto_assets():
    return [a.symbol for a in alpaca.get_assets(status="active") if a.class_ == "crypto"]

def get_account():
    return alpaca.get_account()

def get_latest_price(symbol):
    barset = alpaca.get_crypto_bars(symbol, timeframe="1Min", limit=1)
    return float(barset[-1].close) if barset else None

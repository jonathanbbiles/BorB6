from flask import Flask, jsonify
from trading_strategy import place_trade
from alpaca_client import get_crypto_assets

app = Flask(__name__)

@app.route("/trade", methods=["POST"])
def trigger_trade():
    symbols = get_crypto_assets()
    for s in symbols:
        place_trade(s)
    return jsonify({"message": "Trades evaluated."})

@app.route("/health")
def health():
    return {"status": "running"}

if __name__ == "__main__":
    app.run(debug=True)

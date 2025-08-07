import React from 'react';
import { ScrollView } from 'react-native';
import TradeCard from '../components/TradeCard';

export default function TradeScreen() {
  return (
    <ScrollView>
      {/* mock cards */}
      <TradeCard trade={{ symbol: "BTC/USD", entry: 29000, exit: 29300, status: "closed" }} />
    </ScrollView>
  );
}

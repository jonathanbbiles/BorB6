import React from 'react';
import { View, Text } from 'react-native';

export default function TradeCard({ trade }) {
  return (
    <View>
      <Text>{trade.symbol}</Text>
      <Text>Entry: {trade.entry}</Text>
      <Text>Exit: {trade.exit}</Text>
      <Text>Status: {trade.status}</Text>
    </View>
  );
}

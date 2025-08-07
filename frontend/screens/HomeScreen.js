import React from 'react';
import { View, Button } from 'react-native';
import { triggerTrade } from '../api';
import PortfolioOverview from '../components/PortfolioOverview';

export default function HomeScreen({ navigation }) {
  return (
    <View>
      <PortfolioOverview />
      <Button title="Trigger Trade" onPress={triggerTrade} />
      <Button title="Go to Trades" onPress={() => navigation.navigate('Trades')} />
    </View>
  );
}

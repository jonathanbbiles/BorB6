import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import axios from 'axios';

export default function HomeScreen() {
  const [message, setMessage] = useState('');

  const runTrades = async () => {
    try {
      const res = await axios.post('https://your-render-url.onrender.com/api/trades/run');
      setMessage(`Ran strategy: ${res.data.result.length} actions taken.`);
    } catch (err) {
      setMessage('Error running strategy');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Crypto Scalping Bot</Text>
      <Button title="Run Strategy" onPress={runTrades} />
      <Text>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, marginBottom: 20 }
});

import React from 'react';
import { SafeAreaView, Text } from 'react-native';
import Dashboard from './screens/Dashboard';

export default function App() {
  return (
    <SafeAreaView style={{flex:1}}>
      <Dashboard />
    </SafeAreaView>
  );
}

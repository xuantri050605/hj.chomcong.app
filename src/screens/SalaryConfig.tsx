import React from 'react';
import { View, Text, Button } from 'react-native';
import { DEFAULT_CONFIG } from '../engine/payrollCalculator';

export default function SalaryConfig() {
  return (
    <View style={{flex:1, padding:16}}>
      <Text>Salary Configuration (placeholder)</Text>
      <Text>Default base salary: {DEFAULT_CONFIG.basicSalary}</Text>
      <Button title="Reset to defaults" onPress={() => { /* TODO */ }} />
    </View>
  );
}

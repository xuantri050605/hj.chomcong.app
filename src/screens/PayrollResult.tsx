import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { calculatePayroll, DEFAULT_CONFIG } from '../engine/payrollCalculator';

export default function PayrollResult() {
  // Placeholder: in real app, read from store
  const res = calculatePayroll([], DEFAULT_CONFIG);
  return (
    <ScrollView style={{flex:1,padding:16}}>
      <Text>Payroll Result (placeholder)</Text>
      <Text>Gross: {res.gross}</Text>
      <Text>Net: {res.net}</Text>
    </ScrollView>
  );
}

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { listMonths } from '../utils/persistence';

export default function History() {
  const [months, setMonths] = useState<string[]>([]);
  useEffect(() => { void (async () => setMonths(await listMonths()))(); }, []);
  return (
    <View style={{flex:1,padding:16}}>
      <Text>History</Text>
      <FlatList data={months} keyExtractor={(i)=>i} renderItem={({item}) => (
        <TouchableOpacity><Text>{item}</Text></TouchableOpacity>
      )} />
    </View>
  );
}

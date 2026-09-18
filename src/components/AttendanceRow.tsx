import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { DayAttendance } from '../engine/attendanceCalculator';

export default function AttendanceRow({item, onEdit, onDelete}:{item: DayAttendance; onEdit?: any; onDelete?: any}){
  return (
    <View style={{padding:8, borderBottomWidth:1}}>
      <Text>{item.date} - {item.dayType} - {item.shift ? `${item.shift.start}-${item.shift.end}` : item.leaveType || 'OFF'}</Text>
    </View>
  );
}

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  icon: any;
  color: string;
  size?: number;
}

export const EmblemIcon: React.FC<Props> = ({ icon, color, size = 64 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Rotated background for gem effect */}
      <View style={[
        StyleSheet.absoluteFill, 
        styles.gemShape, 
        { borderColor: color, backgroundColor: '#2A2A2E', shadowColor: color }
      ]} />
      {/* Inner glow */}
      <View style={[
        StyleSheet.absoluteFill, 
        styles.gemShape, 
        { backgroundColor: color, opacity: 0.2, transform: [{ rotate: '45deg' }, { scale: 0.8 }] }
      ]} />
      <MaterialCommunityIcons name={icon} size={size * 0.5} color={color} style={{ zIndex: 10 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    },
  gemShape: {
    borderWidth: 2,
    borderRadius: 8,
    transform: [{ rotate: '45deg' }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  }
});

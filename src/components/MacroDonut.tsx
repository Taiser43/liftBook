import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface MacroDonutProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
  strokeWidth?: number;
}

export default function MacroDonut({ 
  calories, 
  protein, 
  carbs, 
  fat, 
  size = 160, 
  strokeWidth = 16 
}: MacroDonutProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate calories from macros
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  
  // Total calculated calories (to handle percentages accurately even if they don't exactly match raw calories)
  const totalMacroCals = proteinCals + carbsCals + fatCals;

  // If no macros, just show empty gray ring
  const hasData = totalMacroCals > 0;

  const proteinPct = hasData ? (proteinCals / totalMacroCals) : 0;
  const carbsPct = hasData ? (carbsCals / totalMacroCals) : 0;
  const fatPct = hasData ? (fatCals / totalMacroCals) : 0;

  const proteinStroke = proteinPct * circumference;
  const carbsStroke = carbsPct * circumference;
  const fatStroke = fatPct * circumference;

  const proteinOffset = 0;
  const carbsOffset = proteinStroke;
  const fatOffset = proteinStroke + carbsStroke;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size/2}, ${size/2}`}>
          {/* Background Ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#333"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {hasData && (
            <>
              {/* Protein Ring */}
              {proteinPct > 0 && (
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#30D158"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${proteinStroke} ${circumference}`}
                  strokeDashoffset={-proteinOffset}
                  strokeLinecap="round"
                />
              )}
              {/* Carbs Ring */}
              {carbsPct > 0 && (
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#FFD60A"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${carbsStroke} ${circumference}`}
                  strokeDashoffset={-carbsOffset}
                  strokeLinecap="round"
                />
              )}
              {/* Fat Ring */}
              {fatPct > 0 && (
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#FF453A"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${fatStroke} ${circumference}`}
                  strokeDashoffset={-fatOffset}
                  strokeLinecap="round"
                />
              )}
            </>
          )}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centerContent]}>
        <Text style={styles.calsText}>{Math.round(calories)}</Text>
        <Text style={styles.calsLabel}>KCAL</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  calsText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
  },
  calsLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '700',
  },
});

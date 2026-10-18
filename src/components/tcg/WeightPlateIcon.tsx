import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop, Text as SvgText, G } from 'react-native-svg';

export interface WeightPlateIconProps {
  size?: number;
  color?: string;
  rimColor?: string;
  label?: string | number;
  style?: StyleProp<ViewStyle>;
}

export const OLYMPIC_PLATE_COLORS: Record<number, string> = {
  1: '#FFFFFF', // 1 Plate = Weiß (5 kg)
  2: '#22C55E', // 2 Plates = Grün (10 kg)
  3: '#FACC15', // 3 Plates = Gelb (15 kg)
  4: '#3B82F6', // 4 Plates = Blau (20 kg)
  5: '#EF4444', // 5 Plates = Rot (25 kg)
};

export const getOlympicPlateColor = (cost?: number): string => {
  if (!cost) return '#FFD700';
  return OLYMPIC_PLATE_COLORS[cost] || '#FFD700';
};

export const WeightPlateIcon: React.FC<WeightPlateIconProps> = ({
  size = 20,
  color,
  rimColor,
  label,
  style,
}) => {
  const numericLabel = typeof label === 'number' ? label : Number(label);
  const defaultColor = !isNaN(numericLabel) && OLYMPIC_PLATE_COLORS[numericLabel]
    ? OLYMPIC_PLATE_COLORS[numericLabel]
    : '#FFD700';

  const accent = color || defaultColor;
  const rim = rimColor || accent;
  const safeId = accent.replace(/[^a-zA-Z0-9]/g, '');
  const steelId = `plateSteel_${size}_${safeId}`;
  const rimId = `plateRim_${size}_${safeId}`;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: accent,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.45,
          shadowRadius: 2.5,
          elevation: 3,
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Metallic gradient for steel hub */}
          <LinearGradient id={steelId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4A4A5A" />
            <Stop offset="50%" stopColor="#7A7E8F" />
            <Stop offset="100%" stopColor="#2D2D3A" />
          </LinearGradient>
          {/* Subtle sheen for outer rim */}
          <LinearGradient id={rimId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#2A2A36" />
            <Stop offset="100%" stopColor="#14141B" />
          </LinearGradient>
        </Defs>

        {/* 1. Outer Plate Body */}
        <Circle
          cx="50"
          cy="50"
          r="47"
          fill={`url(#${rimId})`}
          stroke={rim}
          strokeWidth="5"
        />

        {/* 2. Outer Bevel Groove (recessed lip) */}
        <Circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="rgba(0,0,0,0.6)"
          strokeWidth="2.5"
        />

        {/* 3. Deep Recessed Surface */}
        <Circle
          cx="50"
          cy="50"
          r="38"
          fill="#13131A"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.5"
        />

        {/* 4. Tri-Grip Embossed Notches / Ridges (authentic gym plate look) */}
        <G stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity={0.75}>
          {/* Top notch */}
          <Path d="M 44 19 A 33 33 0 0 1 56 19" fill="none" />
          {/* Bottom-right notch */}
          <Path d="M 75 66 A 33 33 0 0 1 68 76" fill="none" />
          {/* Bottom-left notch */}
          <Path d="M 32 76 A 33 33 0 0 1 25 66" fill="none" />
        </G>

        {/* 5. Center Steel Hub / Bushing */}
        <Circle
          cx="50"
          cy="50"
          r="19"
          fill={`url(#${steelId})`}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2"
        />

        {/* 6. Center Barbell Sleeve Hole or Stamped Number */}
        {label !== undefined ? (
          <SvgText
            x="50"
            y="59"
            fill={accent}
            fontSize="26"
            fontWeight="bold"
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ) : (
          <Circle
            cx="50"
            cy="50"
            r="9.5"
            fill="#08080C"
            stroke="rgba(0,0,0,0.8)"
            strokeWidth="2"
          />
        )}
      </Svg>
    </View>
  );
};

export default WeightPlateIcon;

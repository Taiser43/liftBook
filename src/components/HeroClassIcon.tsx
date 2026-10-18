import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface Props {
  className: 'Juggernaut' | 'Aesthetic' | 'Ranger' | 'Monk';
  tierColor: string;
  size?: number;
}

const ICONS = {
  Juggernaut: require('../assets/hero_juggernaut.png'),
  Aesthetic: require('../assets/hero_aesthetic.png'),
  Ranger: require('../assets/hero_ranger.png'),
  Monk: require('../assets/hero_monk.png'),
};

export const HeroClassIcon: React.FC<Props> = ({ className, tierColor, size = 80 }) => {
  // We use a slight scale > 1 to crop out any baked-in frame borders
  const scale = 1.15;
  const targetSize = size * scale;
  const offset = -(targetSize - size) / 2;

  return (
    <View style={[styles.container, { width: size, height: size, borderColor: tierColor, shadowColor: tierColor }]}>
      <Image 
        source={ICONS[className]} 
        style={{ 
          width: targetSize, 
          height: targetSize,
          position: 'absolute',
          left: offset,
          top: offset
        }}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tierColor, opacity: 0.2 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
    backgroundColor: '#1E1E20',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

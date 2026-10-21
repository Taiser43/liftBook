import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/store';
import { THEME_LIST, getAppTheme } from '../utils/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AccentThemePickerModal({ visible, onClose }: Props) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const setAccentThemeId = useAppStore(state => state.setAccentThemeId);
  const currentTheme = getAppTheme(accentThemeId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.cardBorder }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="palette-outline" size={22} color={currentTheme.accent} />
              <Text style={styles.title}>Akzentfarbe & Widget-Schimmer</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#AAA" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Wähle deinen bevorzugten Farbton für den Hintergrund-Schimmer aller Widgets und die Akzente in der App:
          </Text>

          <View style={styles.grid}>
            {THEME_LIST.map(item => {
              const isSelected = item.id === currentTheme.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: item.cardBg,
                      borderColor: isSelected ? item.accent : item.subtleBorder,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setAccentThemeId(item.id)}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.colorCircle, { backgroundColor: item.accent }]} />
                    {isSelected && (
                      <View style={[styles.activeBadge, { backgroundColor: item.accentSoftBg, borderColor: item.accentBorder }]}>
                        <MaterialCommunityIcons name="check-bold" size={11} color={item.accent} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.themeName, isSelected && { color: item.accent }]}>{item.name}</Text>
                  <Text style={styles.themeDesc} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: currentTheme.accent }]}
            onPress={onClose}
          >
            <Text style={styles.doneBtnText}>Fertig</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  themeCard: {
    width: '48.2%',
    borderRadius: 14,
    padding: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  activeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  themeDesc: {
    color: '#8E9DA8',
    fontSize: 10,
    marginTop: 2,
  },
  doneBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
});

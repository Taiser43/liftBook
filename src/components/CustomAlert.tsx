import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { useAppStore } from '../store/store';
import { BlurView } from 'expo-blur';
import { getAppTheme } from '../utils/theme';

export default function CustomAlert() {
  const alertOptions = useAppStore(state => state.customAlertOptions);
  const setCustomAlert = useAppStore(state => state.setCustomAlert);
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  if (!alertOptions) return null;

  const buttons = alertOptions.buttons || [{ text: "OK", onPress: () => {} }];

  const handlePress = (onPress?: () => void) => {
    setCustomAlert(null); // Close the modal
    if (onPress) {
      setTimeout(onPress, 50); // slight delay to allow modal to close
    }
  };

  return (
    <Modal
      transparent
      visible={!!alertOptions}
      animationType="fade"
      onRequestClose={() => setCustomAlert(null)}
    >
      <View style={styles.overlay}>
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={[styles.alertBox, { backgroundColor: theme.cardBg || '#1E1E1E', borderColor: theme.cardBorder || '#333', shadowColor: theme.accent || '#000' }]}>
          <Text style={[styles.title, { color: theme.accent || '#00D2FF' }]}>{alertOptions.title}</Text>
          {alertOptions.message ? (
            <Text style={styles.message}>{alertOptions.message}</Text>
          ) : null}
          <View style={styles.buttonContainer}>
            {buttons.map((btn: any, index: number) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    !isDestructive && !isCancel && { backgroundColor: theme.accent || '#00D2FF' },
                    buttons.length > 2 && styles.buttonStacked,
                    isDestructive && styles.buttonDestructive,
                    isCancel && styles.buttonCancel,
                    buttons.length === 2 && index === 0 && { marginRight: 8 },
                    buttons.length === 2 && index === 1 && { marginLeft: 8 },
                  ]}
                  onPress={() => handlePress(btn.onPress)}
                >
                  <Text style={[
                    styles.buttonText,
                    isDestructive && styles.buttonTextDestructive,
                    isCancel && styles.buttonTextCancel,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00D2FF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  button: {
    flex: 1,
    backgroundColor: '#00D2FF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonStacked: {
    width: '100%',
    flex: undefined,
    marginBottom: 10,
  },
  buttonCancel: {
    backgroundColor: '#2C2C2E',
  },
  buttonDestructive: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#121212',
  },
  buttonTextCancel: {
    color: '#FFF',
  },
  buttonTextDestructive: {
    color: '#FFF',
  },
});

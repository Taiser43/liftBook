import React, { useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView,
  Platform, 
  Modal, 
  Animated, 
  Dimensions, 
  PanResponder, 
  TouchableWithoutFeedback 
} from 'react-native';

interface SwipeableModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string | number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SwipeableModal({ 
  visible, 
  onClose, 
  children,
  maxHeight = '90%'
}: SwipeableModalProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 1. Fade in the stationary dark backdrop
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();

      // 2. Slide sheet up from the bottom
      Animated.spring(translateY, {
        toValue: 0,
        bounciness: 2,
        speed: 15,
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Expanded PanResponder for an easier, larger swipe-down drag area
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Trigger if predominantly swiping down
        return gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 70 || gestureState.vy > 0.4) {
          // Dismiss modal smoothly
          handleDismiss();
        } else {
          // Snap back to top
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 3,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal 
      visible={visible} 
      transparent={true} 
      animationType="none" 
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        {/* Stationary Fading Backdrop */}
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Sliding Modal Sheet */}
        <Animated.View 
          style={[
            styles.sheetContainer, 
            { 
              transform: [{ translateY }],
              maxHeight: maxHeight as any
            }
          ]}
        >
          {/* ENLARGED Draggable Swipe-Down Area */}
          <View {...panResponder.panHandlers} style={styles.largeHandleZone}>
            <View style={styles.sheetHandle} />
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>{children}</KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  sheetContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 24,
  },
  // Substantially larger touch target for pulling down
  largeHandleZone: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHandle: {
    width: 52,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#555558',
  },
});

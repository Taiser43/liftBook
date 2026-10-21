import React, { useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, 
  FlatList, Animated, PanResponder, KeyboardAvoidingView, Platform, Dimensions, SafeAreaView 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppTheme } from '../utils/theme';

export const GlobalNotepad = ({ navigationRef }: { navigationRef: any }) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  
  const { globalNotes, addGlobalNote, deleteGlobalNote, accentThemeId } = useAppStore();
  const theme = getAppTheme(accentThemeId);

  const { width, height } = Dimensions.get('window');
  const BUTTON_SIZE = 50;

  // Initial position: Top Right
  const pan = useRef(new Animated.ValueXY({ x: width - BUTTON_SIZE - 20, y: insets.top + 20 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only claim the gesture if the user moves their finger significantly
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  const handleSave = () => {
    if (!noteText.trim()) return;
    
    // Attempt to get the current route name
    let currentScreen = 'Unknown Screen';
    if (navigationRef && navigationRef.isReady()) {
      currentScreen = navigationRef.getCurrentRoute()?.name || 'Unknown Screen';
    }

    addGlobalNote(noteText, currentScreen);
    setNoteText('');
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <>
      <Animated.View
        style={[
          styles.floatingButtonContainer,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={[styles.floatingButton, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
        >
          <MaterialCommunityIcons name="bug" size={24} color="#121212" />
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.subCardBg || '#121212' }]}>
          <View style={[styles.header, { borderBottomColor: theme.subtleBorder || '#222' }]}>
            <Text style={styles.headerTitle}>Bug & Note Tracker</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.inputContainer, { borderBottomColor: theme.subtleBorder || '#222' }]}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBg || '#1E1E1E', borderColor: theme.cardBorder || '#333' }]}
                placeholder="Spotted a bug or have an idea?..."
                placeholderTextColor="#666"
                multiline
                value={noteText}
                onChangeText={setNoteText}
              />
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={handleSave}>
                <MaterialCommunityIcons name="send" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={globalNotes}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={[styles.noteCard, { backgroundColor: theme.cardBg || '#1E1E1E', borderColor: theme.cardBorder || '#333' }]}>
                  <View style={styles.noteHeader}>
                    <Text style={[styles.noteScreen, { color: theme.accent }]}>{item.screenName}</Text>
                    <Text style={styles.noteDate}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.noteText}>{item.text}</Text>
                  <TouchableOpacity 
                    style={styles.deleteBtn}
                    onPress={() => deleteGlobalNote(item.id)}
                  >
                    <MaterialCommunityIcons name="check" size={16} color="#30D158" />
                    <Text style={{ color: '#30D158', fontSize: 12, marginLeft: 4, fontWeight: 'bold' }}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No active notes or bugs. Good job!</Text>
              }
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  floatingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00D2FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    color: '#FFF',
    minHeight: 80,
    maxHeight: 150,
    borderRadius: 12,
    padding: 12,
    paddingTop: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00D2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginBottom: 4,
  },
  noteCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteScreen: {
    color: '#00D2FF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noteDate: {
    color: '#888',
    fontSize: 12,
  },
  noteText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(48, 209, 88, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  }
});

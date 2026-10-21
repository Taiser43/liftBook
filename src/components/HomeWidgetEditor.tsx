import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore, WidgetContainer, WidgetType } from '../store/store';
import { THEME_LIST, getAppTheme } from '../utils/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const WIDGET_NAMES: Record<WidgetType, string> = {
  'streak': 'Streaks Banner',
  'bodyweight': 'Bodyweight Log',
  'workout': 'Today\'s Workout',
  'nextMeal': 'Next Meal',
  'nutrition': 'Nutrition Progress',
  'activity': 'Activity Stats',
  'music': 'Music Player',
  'supplements': 'Supplement Tracker',
  'checkin': 'Wöchentlicher Check-In',
  'arena': '⚔️ Iron Tactics Arena'
};

const ALL_WIDGETS = Object.keys(WIDGET_NAMES) as WidgetType[];

export default function HomeWidgetEditor({ visible, onClose }: Props) {
  const { homeLayout, updateHomeLayout, disabledWidgets, setDisabledWidgets, accentThemeId, setAccentThemeId } = useAppStore();
  const [layout, setLayout] = useState<WidgetContainer[]>(homeLayout);
  const [disabled, setDisabled] = useState<WidgetType[]>(disabledWidgets || []);
  const currentTheme = getAppTheme(accentThemeId);

  React.useEffect(() => {
    if (visible) {
      setLayout(homeLayout);
      setDisabled(disabledWidgets || []);
    }
  }, [visible, homeLayout, disabledWidgets]);

  const saveAndClose = () => {
    updateHomeLayout(layout);
    setDisabledWidgets(disabled);
    onClose();
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newLayout = [...layout];
    const temp = newLayout[index - 1];
    newLayout[index - 1] = newLayout[index];
    newLayout[index] = temp;
    setLayout(newLayout);
  };

  const moveDown = (index: number) => {
    if (index === layout.length - 1) return;
    const newLayout = [...layout];
    const temp = newLayout[index + 1];
    newLayout[index + 1] = newLayout[index];
    newLayout[index] = temp;
    setLayout(newLayout);
  };

  const groupWithPrevious = (index: number) => {
    if (index === 0) return;
    const newLayout = [...layout];
    
    // Combine widgets
    newLayout[index - 1] = {
      ...newLayout[index - 1],
      widgets: [...newLayout[index - 1].widgets, ...newLayout[index].widgets]
    };
    
    // Remove the current one
    newLayout.splice(index, 1);
    setLayout(newLayout);
  };

  const ungroupWidget = (containerIndex: number, widgetIndex: number) => {
    const newLayout = [...layout];
    const container = newLayout[containerIndex];
    
    if (container.widgets.length <= 1) return;

    const widgetToExtract = container.widgets[widgetIndex];
    
    // Remove from current container
    container.widgets = [...container.widgets];
    container.widgets.splice(widgetIndex, 1);
    
    // Create new container right below this one
    newLayout.splice(containerIndex + 1, 0, {
      id: Date.now().toString() + Math.random().toString(),
      widgets: [widgetToExtract]
    });

    setLayout(newLayout);
  };

  const removeWidget = (containerIndex: number, widgetIndex: number) => {
    const newLayout = [...layout];
    const container = newLayout[containerIndex];
    const widgetToRemove = container.widgets[widgetIndex];

    setDisabled([...disabled, widgetToRemove]);

    if (container.widgets.length === 1) {
      newLayout.splice(containerIndex, 1);
    } else {
      container.widgets = [...container.widgets];
      container.widgets.splice(widgetIndex, 1);
    }
    setLayout(newLayout);
  };

  const addWidget = (widget: WidgetType) => {
    setDisabled(disabled.filter(w => w !== widget));
    setLayout([
      ...layout, 
      { id: Date.now().toString() + Math.random().toString(), widgets: [widget] }
    ]);
  };

  const currentWidgetsInLayout = layout.flatMap(c => c.widgets);
  const unplacedWidgets = ALL_WIDGETS.filter(w => !currentWidgetsInLayout.includes(w));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Home & Theme</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40, paddingTop: 14 }}>
          {/* ACCENT COLOR & WIDGET SHIMMER SELECTOR */}
          <View style={[styles.containerCard, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.cardBorder, padding: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <MaterialCommunityIcons name="palette-outline" size={18} color={currentTheme.accent} />
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>App Akzentfarbe & Widget-Schimmer</Text>
            </View>
            <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 12 }}>
              Bestimmt den Hintergrund-Schimmer aller Widgets (Home, Ernährung & Training) sowie die Akzentfarbe:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {THEME_LIST.map(t => {
                const isSel = t.id === currentTheme.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setAccentThemeId(t.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 7,
                      backgroundColor: t.cardBg,
                      borderWidth: isSel ? 2 : 1,
                      borderColor: isSel ? t.accent : t.subtleBorder,
                      paddingHorizontal: 11,
                      paddingVertical: 8,
                      borderRadius: 12,
                    }}
                  >
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: t.accent }} />
                    <Text style={{ color: isSel ? t.accent : '#E5E7EB', fontSize: 12, fontWeight: '800' }}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={[styles.helperText, { marginTop: 4, marginBottom: 12 }]}>
            Move items up or down. Group items together to create swipeable horizontal stacks!
          </Text>

          {layout.map((container, cIndex) => (
            <View key={container.id} style={styles.containerCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {container.widgets.length > 1 ? `Stack (${container.widgets.length})` : 'Row'}
                </Text>
                
                <View style={styles.cardActions}>
                  {cIndex > 0 && (
                    <>
                      <TouchableOpacity onPress={() => groupWithPrevious(cIndex)} style={styles.actionBtn}>
                        <MaterialCommunityIcons name="link-variant-plus" size={20} color="#BF5AF2" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => moveUp(cIndex)} style={styles.actionBtn}>
                        <MaterialCommunityIcons name="arrow-up" size={20} color="#00D2FF" />
                      </TouchableOpacity>
                    </>
                  )}
                  {cIndex < layout.length - 1 && (
                    <TouchableOpacity onPress={() => moveDown(cIndex)} style={styles.actionBtn}>
                      <MaterialCommunityIcons name="arrow-down" size={20} color="#00D2FF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {container.widgets.map((widget, wIndex) => (
                <View key={widget} style={styles.widgetRow}>
                  <MaterialCommunityIcons name="drag-horizontal" size={20} color="#666" style={{ marginRight: 12 }} />
                  <Text style={styles.widgetName}>{WIDGET_NAMES[widget]}</Text>
                  
                  {container.widgets.length > 1 && (
                    <TouchableOpacity onPress={() => ungroupWidget(cIndex, wIndex)} style={{ marginRight: 12 }}>
                      <MaterialCommunityIcons name="link-variant-remove" size={20} color="#FF9500" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removeWidget(cIndex, wIndex)}>
                    <MaterialCommunityIcons name="eye-off" size={20} color="#FF453A" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}

          {unplacedWidgets.length > 0 && (
            <View style={styles.disabledSection}>
              <Text style={styles.disabledTitle}>Available Widgets</Text>
              {unplacedWidgets.map(widget => (
                <View key={widget} style={styles.disabledRow}>
                  <Text style={styles.disabledName}>{WIDGET_NAMES[widget]}</Text>
                  <TouchableOpacity style={styles.addBtn} onPress={() => addWidget(widget)}>
                    <MaterialCommunityIcons name="plus" size={20} color="#000" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={saveAndClose}>
            <Text style={styles.saveBtnText}>Save Layout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#333',
    paddingTop: 20
  },
  title: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  closeBtn: { position: 'absolute', right: 16, top: 20 },
  helperText: { color: '#888', fontSize: 14, textAlign: 'center', margin: 16, lineHeight: 20 },
  list: { flex: 1, paddingHorizontal: 16 },
  containerCard: { 
    backgroundColor: '#1E1E1E', 
    borderRadius: 12, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden'
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    backgroundColor: '#282828' 
  },
  cardTitle: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 4 },
  widgetRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#282828'
  },
  widgetName: { color: '#FFF', fontSize: 16, fontWeight: '600', flex: 1 },
  disabledSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  disabledTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  disabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  disabledName: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#000',
    fontWeight: '700',
    marginLeft: 4,
  },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#333', backgroundColor: '#1E1E1E' },
  saveBtn: { backgroundColor: '#00D2FF', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '800' }
});

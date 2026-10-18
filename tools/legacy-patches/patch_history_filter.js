const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioHistoryScreen.tsx', 'utf8');

// 1. Add imports and state
code = code.replace(
  `import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useCardioStore, CardioSession } from '../store/useCardioStore';`,
  `import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Dimensions, ScrollView } from 'react-native';
import { useCardioStore, CardioSession, CardioActivityType } from '../store/useCardioStore';`
);

code = code.replace(
  `  const maxHR = useCardioStore(state => state.maxHeartRateSetting);
  const [expandedId, setExpandedId] = useState<string | null>(null);`,
  `  const maxHR = useCardioStore(state => state.maxHeartRateSetting);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  const toggleType = (type: string) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };
  
  const filteredHistory = selectedTypes.length > 0 
    ? history.filter(s => selectedTypes.includes(s.type))
    : history;
    
  const ALL_TYPES = ['Running', 'Cycling', 'Boxing', 'Swimming', 'Paddle', 'Football', 'Walking'];`
);

// 2. Add filter UI
code = code.replace(
  `      {history.length === 0 ? (`,
  `      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {ALL_TYPES.map(type => (
            <TouchableOpacity 
              key={type} 
              style={[styles.filterPill, selectedTypes.includes(type) && styles.filterPillActive]}
              onPress={() => toggleType(type)}
            >
              <Text style={[styles.filterPillText, selectedTypes.includes(type) && styles.filterPillTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {filteredHistory.length === 0 ? (`
);

// 3. Fix FlatList data source
code = code.replace(
  `          data={history}`,
  `          data={filteredHistory}`
);

// 4. Add styles
code = code.replace(
  `  emptyText: { color: '#888', fontSize: 16 },`,
  `  emptyText: { color: '#888', fontSize: 16 },
  filterContainer: { marginBottom: 10 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E1E1E', marginRight: 10, borderWidth: 1, borderColor: '#333' },
  filterPillActive: { backgroundColor: '#00D2FF', borderColor: '#00D2FF' },
  filterPillText: { color: '#888', fontWeight: 'bold' },
  filterPillTextActive: { color: 'black' },`
);

fs.writeFileSync('src/screens/CardioHistoryScreen.tsx', code);
console.log('Done');

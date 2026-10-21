import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCoreStore } from '../store/useCoreStore';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import { useBottomSpacing } from '../hooks/useBottomSpacing';

export default function CoreLibraryScreen({ navigation }: any) {
  const bottomSpacing = useBottomSpacing();
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const { searchQuery, activeFilter, setSearchQuery, setActiveFilter, filteredExercises, getAllCategories, favoriteIds, toggleFavorite } = useCoreStore();

  const exercises = filteredExercises();
  const categories = getAllCategories();

  // Pick some top categories to show in quick filters
  const quickFilters = categories;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Core Exercises</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search abs or core exercises..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={quickFilters}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.filterChip, activeFilter === item && [styles.filterChipActive, { backgroundColor: theme.accentSoftBg, borderColor: theme.accent }]]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.filterChipText, activeFilter === item && [styles.filterChipTextActive, { color: theme.accent }]]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContainer, { paddingBottom: bottomSpacing }]}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, borderWidth: 1 }]}
            onPress={() => navigation.navigate('CoreDetail', { id: item.id })}
          >
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="dumbbell" size={40} color="#666" />
              </View>
            )}
            <View style={styles.cardContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={[styles.cardTitle, { flex: 1, paddingRight: 8 }]}>{item.title}</Text>
                <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name={favoriteIds.includes(item.id) ? "star" : "star-outline"} size={24} color={favoriteIds.includes(item.id) ? "#FFD60A" : "#888"} />
                </TouchableOpacity>
              </View>
              <View style={styles.tagContainer}>
                {item.categories.slice(0, 3).map(c => (
                  <View key={c} style={styles.tag}>
                    <Text style={styles.tagText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="magnify-close" size={48} color="#666" />
            <Text style={styles.emptyText}>No core exercises found.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 10 },
  backBtn: { marginRight: 15 },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 15 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: 'white', fontSize: 16 },
  filterWrapper: { marginBottom: 15, height: 40 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E1E1E', marginRight: 10, borderWidth: 1, borderColor: '#333' },
  filterChipActive: { backgroundColor: 'rgba(0, 210, 255, 0.2)', borderColor: '#00D2FF' },
  filterChipText: { color: '#888', fontWeight: 'bold' },
  filterChipTextActive: { color: '#00D2FF' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 16, marginBottom: 15, overflow: 'hidden', flexDirection: 'row' },
  cardImage: { width: 100, height: 100, backgroundColor: '#2A2A2A' },
  cardContent: { flex: 1, padding: 15, justifyContent: 'center' },
  cardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 6, marginBottom: 6 },
  tagText: { color: '#AAA', fontSize: 12, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#888', marginTop: 10, fontSize: 16 }
});

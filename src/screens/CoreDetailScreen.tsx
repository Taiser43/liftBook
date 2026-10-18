import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCoreStore } from '../store/useCoreStore';

export default function CoreDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const exercises = useCoreStore(state => state.exercises);
  const favoriteIds = useCoreStore(state => state.favoriteIds);
  const toggleFavorite = useCoreStore(state => state.toggleFavorite);
  const setActiveFilter = useCoreStore(state => state.setActiveFilter);
  const exercise = exercises.find(e => e.id === id);

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safeArea}>
         <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={{color: 'white', padding: 20}}>Exercise not found</Text>
      </SafeAreaView>
    );
  }

  const cleanDescription = exercise.description.replace(new RegExp('^' + exercise.title.toUpperCase() + '\\s*', 'i'), '').trim();

  let videoId = '';
  if (exercise.videoUrl) {
    const match = exercise.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      videoId = match[1];
    }
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          body { margin: 0; background-color: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?playsinline=1&modestbranding=1&rel=0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{exercise.title}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => toggleFavorite(exercise.id)}>
          <MaterialCommunityIcons name={favoriteIds.includes(exercise.id) ? "star" : "star-outline"} size={28} color={favoriteIds.includes(exercise.id) ? "#FFD60A" : "#888"} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {videoId ? (
          <View>
            <View style={styles.videoContainer}>
              <WebView
                source={{ html: htmlContent, baseUrl: 'https://www.youtube.com' }}
                style={styles.webview}
                allowsInlineMediaPlayback
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
              />
            </View>
            <TouchableOpacity 
              style={{ backgroundColor: '#222', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 8, borderRadius: 8, marginHorizontal: 20 }}
              onPress={() => {
                const { Linking } = require('react-native');
                Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`);
              }}
            >
              <MaterialCommunityIcons name="open-in-new" size={20} color="#00D2FF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#00D2FF', fontWeight: 'bold' }}>In YouTube App öffnen</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.videoContainer, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
            {exercise.thumbnailUrl ? (
               <Image source={{uri: exercise.thumbnailUrl}} style={{width: '100%', height: '100%', opacity: 0.4}} resizeMode="cover" />
            ) : (
               <MaterialCommunityIcons name="image-off-outline" size={48} color="#666" />
            )}
            <View style={{ position: 'absolute', alignItems: 'center', padding: 20 }}>
               <MaterialCommunityIcons name="video-off-outline" size={48} color="#FFF" />
               <Text style={{color: '#FFF', marginTop: 10, fontWeight: 'bold', textAlign: 'center'}}>Video nicht in der Datenbank hinterlegt.</Text>
               <TouchableOpacity 
                 style={{ marginTop: 16, backgroundColor: '#FF0000', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, flexDirection: 'row', alignItems: 'center' }}
                 onPress={() => {
                   const { Linking } = require('react-native');
                   Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.title + ' core exercise tutorial')}`);
                 }}
               >
                 <MaterialCommunityIcons name="youtube" size={20} color="#FFF" style={{ marginRight: 8 }} />
                 <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Auf YouTube suchen</Text>
               </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Instruction</Text>
          <Text style={styles.descriptionText}>{cleanDescription}</Text>
          
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Categories</Text>
          <View style={styles.tagContainer}>
            {exercise.categories.map(c => (
              <TouchableOpacity 
                key={c} 
                style={styles.tag}
                onPress={() => {
                  setActiveFilter(c);
                  navigation.navigate('CoreLibrary');
                }}
              >
                <Text style={styles.tagText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 10 },
  backBtn: { padding: 4 },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center', marginHorizontal: 10 },
  scrollContent: { paddingBottom: 40 },
  videoContainer: { width: '100%', height: 220, backgroundColor: '#000', marginVertical: 10 },
  webview: { flex: 1, backgroundColor: 'black' },
  infoSection: { padding: 20 },
  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  descriptionText: { color: '#CCC', fontSize: 16, lineHeight: 24 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 10, marginBottom: 10 },
  tagText: { color: 'white', fontWeight: 'bold' }
});

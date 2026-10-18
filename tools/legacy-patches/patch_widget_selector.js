const fs = require('fs');
let content = fs.readFileSync('src/components/InWorkoutMusicWidget.tsx', 'utf8');

// 1. Add useState and import
if (!content.includes('PowerSongSelectorModal')) {
  content = content.replace(
    "import React, { useRef } from 'react';",
    "import React, { useRef, useState } from 'react';\nimport PowerSongSelectorModal from './PowerSongSelectorModal';"
  );
}

// 2. Add local state to InWorkoutMusicWidget
content = content.replace(
  "  const { currentSongId",
  "  const [selectorVisible, setSelectorVisible] = useState(false);\n  const { currentSongId"
);

// 3. Update handleTriggerPowerSong
const oldTrigger = `  const handleTriggerPowerSong = () => {
    if (!powerSong) return;
    
    // Fallback checks
    const playlist = playlists.find(p => p.id === powerSong.playlistId);
    if (!playlist) return;
    const song = playlist.songs.find(s => s.id === powerSong.songId);
    if (!song) return;

    setCurrentSong(powerSong.playlistId, powerSong.songId);
    
    setTimeout(async () => {
      try {
        await TrackPlayer.seekTo(powerSong.startPosition || 0);
      } catch (e) {
        console.warn(e);
      }
    }, 1000);
  };`;

const newTrigger = `  const handleTriggerPowerSong = () => {
    if (!powerSong) {
      setSelectorVisible(true);
      return;
    }
    
    // Fallback checks
    const playlist = playlists.find(p => p.id === powerSong.playlistId);
    if (!playlist) return;
    const song = playlist.songs.find(s => s.id === powerSong.songId);
    if (!song) return;

    setCurrentSong(powerSong.playlistId, powerSong.songId);
    
    setTimeout(async () => {
      try {
        await TrackPlayer.seekTo(powerSong.startPosition || 0);
      } catch (e) {
        console.warn(e);
      }
    }, 1000);
  };`;

content = content.replace(oldTrigger, newTrigger);

// 4. Always show the hype button
const oldBtn = `{powerSong && (
            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: 'rgba(255, 214, 10, 0.2)' }]} onPress={handleTriggerPowerSong}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFD60A" />
            </TouchableOpacity>
          )}`;

const newBtn = `<TouchableOpacity 
            style={[styles.controlBtn, { backgroundColor: powerSong ? 'rgba(255, 214, 10, 0.2)' : 'transparent', borderWidth: powerSong ? 0 : 1, borderColor: 'rgba(255, 214, 10, 0.4)' }]} 
            onPress={handleTriggerPowerSong}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFD60A" />
          </TouchableOpacity>`;

content = content.replace(oldBtn, newBtn);

// 5. Add the SelectorModal to the render tree
const oldRender = `    <View style={styles.container}>
      <Animated.View`;

const newRender = `    <View style={styles.container}>
      <PowerSongSelectorModal visible={selectorVisible} onClose={() => setSelectorVisible(false)} />
      <Animated.View`;

content = content.replace(oldRender, newRender);

fs.writeFileSync('src/components/InWorkoutMusicWidget.tsx', content);

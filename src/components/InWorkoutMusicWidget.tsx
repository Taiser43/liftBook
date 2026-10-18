import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import TrackPlayer, { useProgress, usePlaybackState, State } from 'react-native-track-player';
import { useMusicStore } from '../store/useMusicStore';
import PowerSongSelectorModal from './PowerSongSelectorModal';
const { getResolvedUri } = require('../utils/uriResolver');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface InWorkoutMusicWidgetProps {
  onExpandChange?: (expanded: boolean) => void;
}

export default function InWorkoutMusicWidget({ onExpandChange }: InWorkoutMusicWidgetProps = {}) {
  const { currentSongId, currentPlaylistId, playlists, playNext, playPrevious, setIsPlaying, powerSong, setCurrentSong, currentQueueSong } = useMusicStore();
  const progress = useProgress();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  
  const [expanded, setExpanded] = useState(false);
  const [selectorVisible, setSelectorVisible] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
  };

  const currentPlaylist = playlists.find(p => p.id === currentPlaylistId);
  const currentSong = currentQueueSong || currentPlaylist?.songs.find(s => s.id === currentSongId);

  const togglePlayPause = async (e: any) => {
    e.stopPropagation();
    try {
      if (isPlaying) {
        await TrackPlayer.pause();
        setIsPlaying(false);
      } else {
        await TrackPlayer.play();
        setIsPlaying(true);
      }
    } catch(e) { console.warn(e); }
  };

  const handleSeekBackward = async (e: any) => {
    e.stopPropagation();
    const newPos = Math.max(0, progress.position - 15);
    await TrackPlayer.seekTo(newPos);
  };

  const handleSeekForward = async (e: any) => {
    e.stopPropagation();
    const newPos = Math.min(progress.duration, progress.position + 30);
    await TrackPlayer.seekTo(newPos);
  };

  const handlePlaylistSelect = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && playlist.songs.length > 0) {
      setCurrentSong(playlistId, playlist.songs[0].id);
    }
  };

  if (!currentSong) return <View style={{ display: 'none' }} />;

  return (
    <View style={[styles.container, !expanded && { padding: 6, paddingBottom: 2 }]}>
      <PowerSongSelectorModal visible={selectorVisible} onClose={() => setSelectorVisible(false)} />
      
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={toggleExpand} 
        style={[styles.swipeArea, { paddingBottom: expanded ? 4 : 2 }]}
      >
        <View style={styles.musicLeft}>
          <View style={[styles.musicIconBg, (currentSong.coverUri || currentPlaylist?.coverUri) && { padding: 0, backgroundColor: 'transparent' }, !expanded && { width: 30, height: 30, borderRadius: 15 }]}>
            {(currentSong.coverUri || currentPlaylist?.coverUri) ? (
              <Image source={{ uri: getResolvedUri(currentSong.coverUri || currentPlaylist?.coverUri) }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
            ) : (
              <MaterialCommunityIcons name="music-note" size={expanded ? 20 : 15} color="#FFD700" />
            )}
          </View>
          <View style={{ marginLeft: 8, flex: 1, paddingRight: 4, justifyContent: 'center' }}>
            <Text style={[styles.musicTitle, !expanded && { fontSize: 13 }]} numberOfLines={1}>
              {currentSong.title}
            </Text>
            {expanded && <Text style={styles.musicArtist} numberOfLines={1}>{currentSong.artist || 'Unknown Artist'}</Text>}
          </View>
        </View>

        <View style={styles.musicControls}>
          {!expanded && (
            <TouchableOpacity 
              style={[styles.controlBtn, !expanded && { width: 30, height: 30, borderRadius: 15 }]} 
              onPress={(e) => { e.stopPropagation(); setSelectorVisible(true); }}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={expanded ? 20 : 15} color="#FFD60A" />
            </TouchableOpacity>
          )}
          {expanded && (
            <TouchableOpacity style={styles.controlBtn} onPress={handleSeekBackward}>
              <MaterialCommunityIcons name="rewind-15" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.controlBtn, !expanded && { width: 30, height: 30, borderRadius: 15 }]} onPress={togglePlayPause}>
            <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={expanded ? 26 : 18} color="#FFF" />
          </TouchableOpacity>
          {expanded && (
            <TouchableOpacity style={styles.controlBtn} onPress={handleSeekForward}>
              <MaterialCommunityIcons name="fast-forward-30" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          {!expanded && (
            <TouchableOpacity style={[styles.controlBtn, !expanded && { width: 30, height: 30, borderRadius: 15 }]} onPress={(e) => { e.stopPropagation(); playNext(); }}>
              <MaterialCommunityIcons name="skip-next" size={expanded ? 26 : 18} color="#FFF" />
            </TouchableOpacity>
          )}
          {expanded && (
            <TouchableOpacity 
              style={[styles.controlBtn, { backgroundColor: 'rgba(255, 215, 0, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.4)', marginLeft: 6 }]} 
              onPress={(e) => { 
                e.stopPropagation(); 
                toggleExpand(); 
              }}
            >
              <MaterialCommunityIcons name="chevron-up" size={22} color="#FFD700" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      <View style={[styles.sliderArea, !expanded && { marginTop: 0 }]}>
        <Slider
          style={{ width: '100%', height: expanded ? 10 : 6 }}
          minimumValue={0}
          maximumValue={progress.duration || 1}
          value={progress.position}
          minimumTrackTintColor="#00D2FF"
          maximumTrackTintColor="rgba(255,255,255,0.1)"
          thumbTintColor="transparent"
          onSlidingComplete={async (val) => {
            await TrackPlayer.seekTo(val);
          }}
        />
      </View>

      {expanded && playlists && playlists.length > 0 && (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingTop: 12 }}>
          <Text style={{ color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 }}>PLAYLISTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {playlists.map(pl => (
              <TouchableOpacity 
                key={pl.id} 
                style={[
                  styles.playlistChip, 
                  currentPlaylistId === pl.id && { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.1)' }
                ]}
                onPress={() => handlePlaylistSelect(pl.id)}
              >
                {pl.coverUri ? (
                  <Image source={{ uri: getResolvedUri(pl.coverUri) }} style={{ width: 24, height: 24, borderRadius: 4, marginRight: 6 }} />
                ) : (
                  <MaterialCommunityIcons name="playlist-music" size={16} color={currentPlaylistId === pl.id ? '#FFD700' : '#FFF'} style={{ marginRight: 6 }} />
                )}
                <Text style={{ color: currentPlaylistId === pl.id ? '#FFD700' : '#FFF', fontSize: 13, fontWeight: '600' }}>{pl.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  swipeArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  musicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    overflow: 'hidden',
  },
  musicIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  musicArtist: {
    color: '#AAA',
    fontSize: 13,
    marginTop: 2,
  },
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sliderArea: {
    marginTop: 8,
  },
  playlistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  }
});

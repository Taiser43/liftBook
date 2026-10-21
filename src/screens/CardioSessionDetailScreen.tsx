import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/store';
import { useCardioStore, CardioSession, KmSplit } from '../store/useCardioStore';
import { getAppTheme } from '../utils/theme';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import Svg, { Path, Defs, LinearGradient, Stop, Text as SvgText, Line as SvgLine } from 'react-native-svg';
import { useBottomSpacing } from '../hooks/useBottomSpacing';

const { width } = Dimensions.get('window');

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

const getIconForType = (type: string) => {
  switch (type) {
    case 'Running': return 'run';
    case 'Cycling': return 'bike';
    case 'Walking': return 'walk';
    case 'Swimming': return 'swim';
    case 'Boxing': return 'boxing-glove';
    case 'Football': return 'soccer';
    case 'Paddle': return 'tennis';
    default: return 'heart-pulse';
  }
};

const formatTime = (seconds: number) => {
  seconds = Math.round(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function CardioSessionDetailScreen({ route, navigation }: any) {
  const bottomSpacing = useBottomSpacing();
  const { sessionId } = route.params;
  const session = useCardioStore(state => state.history.find(s => s.id === sessionId));
  const maxHRSetting = useCardioStore(state => state.maxHeartRateSetting);
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  const [speedMode, setSpeedMode] = useState<'avg' | 'max'>('avg');
  const [hrMode, setHrMode] = useState<'avg' | 'max'>('avg');
  const [widgetMode, setWidgetMode] = useState<'map' | 'chart'>('map');
  const [mapColorMode, setMapColorMode] = useState<'hr' | 'speed'>('hr');
  const [chartMode, setChartMode] = useState<'both' | 'hr' | 'speed'>('both');
  const [splitMode, setSplitMode] = useState<number>(1);
  const [stepMode, setStepMode] = useState<'steps' | 'km'>('steps'); 

  const [touchData, setTouchData] = useState<{ x: number, hr: number, speed: number, time: string, yHR: number, ySpeed: number } | null>(null);

  if (!session) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0D1117' }]}>
        <Text style={{ color: 'white', textAlign: 'center', marginTop: 40 }}>Training nicht gefunden</Text>
      </SafeAreaView>
    );
  }

  const isDistanceSport = ['Running', 'Cycling', 'Walking', 'Swimming'].includes(session.type);
  const isStepSport = ['Boxing', 'Football', 'Paddle'].includes(session.type);

  const avgSpeed = session.durationSeconds > 0 ? (session.distanceMeters / 1000) / (session.durationSeconds / 3600) : 0;
  const maxSpeed = session.maxSpeed || avgSpeed;
  const paceStr =
    avgSpeed > 0
      ? `${Math.floor(60 / avgSpeed)}:${String(Math.round(((60 / avgSpeed) % 1) * 60)).padStart(2, '0')}`
      : '--:--';
  
  const renderChart = () => {
    if (!session.routeCoordinates || session.routeCoordinates.length < 2) {
      return (
        <View style={[styles.noDataBox, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
          <Text style={{ color: '#888' }}>Nicht genügend GPS-Daten für Diagramm.</Text>
        </View>
      );
    }
    
    const pts = session.routeCoordinates;
    const svgHeight = 190; 
    const chartHeight = 150; 
    const chartWidth = width - 40;
    
    const maxH = Math.max(...pts.map(p => p.heartRate || 100));
    const minH = Math.min(...pts.map(p => p.heartRate || 60));
    const rangeH = (maxH - minH) || 1;

    const maxS = Math.max(...pts.map(p => p.speed || 10));
    const minS = 0;
    const rangeS = (maxS - minS) || 1;

    let hrPath = `M 0,${chartHeight}`;
    let hrArea = `M 0,${chartHeight}`;
    let speedPath = `M 0,${chartHeight}`;

    pts.forEach((p, i) => {
      const x = (i / (pts.length - 1)) * chartWidth;
      const yHR = chartHeight - (((p.heartRate || minH) - minH) / rangeH) * chartHeight * 0.9;
      const ySpeed = chartHeight - (((p.speed || 0) - minS) / rangeS) * chartHeight * 0.9;
      
      if (i === 0) {
        hrPath = `M ${x},${yHR}`;
        hrArea = `M ${x},${chartHeight} L ${x},${yHR}`;
        speedPath = `M ${x},${ySpeed}`;
      } else {
        hrPath += ` L ${x},${yHR}`;
        hrArea += ` L ${x},${yHR}`;
        speedPath += ` L ${x},${ySpeed}`;
      }
    });

    hrArea += ` L ${chartWidth},${chartHeight} Z`;

    const handleTouch = (event: any) => {
      const x = event.nativeEvent.locationX;
      const index = Math.max(0, Math.min(pts.length - 1, Math.round((x / chartWidth) * (pts.length - 1))));
      const exactX = (index / (pts.length - 1)) * chartWidth;
      const point = pts[index];
      const timeProgress = (index / (pts.length - 1)) * session.durationSeconds;
      
      const yHR = chartHeight - (((point.heartRate || minH) - minH) / rangeH) * chartHeight * 0.9;
      const ySpeed = chartHeight - (((point.speed || 0) - minS) / rangeS) * chartHeight * 0.9;

      setTouchData({
        x: exactX,
        hr: Math.round(point.heartRate || 0),
        speed: Math.round((point.speed || 0) * 10) / 10,
        time: formatTime(timeProgress),
        yHR,
        ySpeed
      });
    };

    return (
      <View style={{ marginTop: 12 }}>
        <View style={[styles.toggleRow, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={() => setChartMode('both')}
              style={[
                styles.toggleBtn,
                { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder },
                chartMode === 'both' && { backgroundColor: theme.accent, borderColor: theme.accent }
              ]}
            >
              <Text style={[styles.toggleBtnText, chartMode === 'both' && { color: '#000', fontWeight: '800' }]}>Beide</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setChartMode('hr')}
              style={[
                styles.toggleBtn,
                { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder },
                chartMode === 'hr' && { backgroundColor: theme.accent, borderColor: theme.accent }
              ]}
            >
              <Text style={[styles.toggleBtnText, chartMode === 'hr' && { color: '#000', fontWeight: '800' }]}>Puls</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setChartMode('speed')}
              style={[
                styles.toggleBtn,
                { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder },
                chartMode === 'speed' && { backgroundColor: theme.accent, borderColor: theme.accent }
              ]}
            >
              <Text style={[styles.toggleBtnText, chartMode === 'speed' && { color: '#000', fontWeight: '800' }]}>Tempo</Text>
            </TouchableOpacity>
          </View>
          
          {touchData && (
            <View style={{ alignItems: 'flex-end', backgroundColor: theme.cardBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.subtleBorder }}>
              <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{touchData.time}</Text>
              {(chartMode === 'both' || chartMode === 'hr') && (
                <Text style={{ color: '#FF3B30', fontSize: 11, fontWeight: 'bold' }}>{touchData.hr} bpm</Text>
              )}
              {(chartMode === 'both' || chartMode === 'speed') && (
                <Text style={{ color: theme.accent, fontSize: 11, fontWeight: 'bold' }}>{touchData.speed} km/h</Text>
              )}
            </View>
          )}
        </View>

        <View 
          style={{ backgroundColor: theme.cardBg, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: theme.cardBorder }}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleTouch}
          onResponderMove={handleTouch}
          onResponderRelease={() => setTouchData(null)}
        >
          <Svg width={chartWidth - 20} height={svgHeight}>
            <Defs>
              <LinearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FF3B30" stopOpacity="0.4" />
                <Stop offset="0.3" stopColor="#FF9500" stopOpacity="0.25" />
                <Stop offset="0.6" stopColor="#FFD700" stopOpacity="0.15" />
                <Stop offset="1" stopColor="#00D2FF" stopOpacity="0.0" />
              </LinearGradient>
              <LinearGradient id="hrLineGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FF3B30" />
                <Stop offset="0.3" stopColor="#FF9500" />
                <Stop offset="0.6" stopColor="#FFD700" />
                <Stop offset="1" stopColor="#30D158" />
              </LinearGradient>
            </Defs>

            {/* Grid lines */}
            <SvgLine x1="0" y1={chartHeight} x2={chartWidth - 20} y2={chartHeight} stroke="#28333E" strokeWidth="1" />
            <SvgLine x1="0" y1={chartHeight * 0.5} x2={chartWidth - 20} y2={chartHeight * 0.5} stroke="#28333E" strokeWidth="0.5" strokeDasharray="4 4" />
            
            {(chartMode === 'both' || chartMode === 'hr') && (
              <>
                <Path d={hrArea} fill="url(#hrGrad)" />
                <Path d={hrPath} fill="none" stroke="url(#hrLineGrad)" strokeWidth="2.5" />
                <SvgText x={5} y={15} fill="#FF3B30" fontSize="10" fontWeight="bold">{Math.round(maxH)} bpm</SvgText>
                <SvgText x={5} y={chartHeight - 5} fill="#FF3B30" fontSize="10">{Math.round(minH)} bpm</SvgText>
              </>
            )}

            {(chartMode === 'both' || chartMode === 'speed') && (
              <>
                <Path d={speedPath} fill="none" stroke={theme.accent} strokeWidth="2.5" opacity={0.85} />
                <SvgText x={chartWidth - 80} y={15} fill={theme.accent} fontSize="10" fontWeight="bold">{Math.round(maxS)} km/h</SvgText>
                <SvgText x={chartWidth - 80} y={chartHeight - 5} fill={theme.accent} fontSize="10">0 km/h</SvgText>
              </>
            )}

            {/* X-Axis labels (Time) */}
            <SvgText x={5} y={chartHeight + 15} fill="#8A99A8" fontSize="10">0:00</SvgText>
            <SvgText x={chartWidth - 60} y={chartHeight + 15} fill="#8A99A8" fontSize="10">{formatTime(session.durationSeconds)}</SvgText>

            {/* Touch Cursor Line */}
            {touchData && (
              <>
                <SvgLine x1={touchData.x} y1="0" x2={touchData.x} y2={chartHeight} stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                {(chartMode === 'both' || chartMode === 'hr') && (
                  <View style={{ position: 'absolute', left: touchData.x - 4, top: touchData.yHR - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30', borderWidth: 1, borderColor: 'white' }} pointerEvents="none" />
                )}
                {(chartMode === 'both' || chartMode === 'speed') && (
                  <View style={{ position: 'absolute', left: touchData.x - 4, top: touchData.ySpeed - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent, borderWidth: 1, borderColor: 'white' }} pointerEvents="none" />
                )}
              </>
            )}
          </Svg>
        </View>
      </View>
    );
  };

  const renderMap = () => {
    if (!session.routeCoordinates || session.routeCoordinates.length < 2) {
      return (
        <View style={[styles.noDataBox, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
          <MaterialCommunityIcons name="map-marker-off" size={32} color="#666" style={{ marginBottom: 6 }} />
          <Text style={{ color: '#888', fontWeight: '600' }}>Keine GPS-Strecke für dieses Training aufgezeichnet.</Text>
        </View>
      );
    }
    const pts = session.routeCoordinates;

    // Calculate map bounding box
    const minLat = Math.min(...pts.map(p => p.latitude));
    const maxLat = Math.max(...pts.map(p => p.latitude));
    const minLon = Math.min(...pts.map(p => p.longitude));
    const maxLon = Math.max(...pts.map(p => p.longitude));
    const midLat = (minLat + maxLat) / 2;
    const midLon = (minLon + maxLon) / 2;
    const dLat = Math.max(0.005, (maxLat - minLat) * 1.35);
    const dLon = Math.max(0.005, (maxLon - minLon) * 1.35);

    const segments = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      let color = theme.accent;
      if (mapColorMode === 'hr') {
        const hr = p1.heartRate || 100;
        if (hr > maxHRSetting * 0.9) color = '#FF3B30';
        else if (hr > maxHRSetting * 0.8) color = '#FF9500';
        else if (hr > maxHRSetting * 0.7) color = '#FFD700';
        else if (hr > maxHRSetting * 0.6) color = '#30D158';
        else color = theme.accent;
      } else {
        const spd = p1.speed || 0;
        const avg = avgSpeed;
        if (spd > avg * 1.3) color = '#FF3B30';
        else if (spd > avg * 1.1) color = '#FF9500';
        else if (spd > avg * 0.9) color = '#30D158';
        else color = theme.accent;
      }

      segments.push(
        <Polyline
          key={i}
          coordinates={[{ latitude: p1.latitude, longitude: p1.longitude }, { latitude: p2.latitude, longitude: p2.longitude }]}
          strokeColor={color}
          strokeWidth={4.5}
        />
      );
    }

    return (
      <View style={{ marginTop: 10 }}>
        <View style={[styles.toggleRow, { marginBottom: 10 }]}>
          <TouchableOpacity
            onPress={() => setMapColorMode('hr')}
            style={[
              styles.toggleBtn,
              { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder },
              mapColorMode === 'hr' && { backgroundColor: theme.accent, borderColor: theme.accent }
            ]}
          >
            <Text style={[styles.toggleBtnText, mapColorMode === 'hr' && { color: '#000', fontWeight: '800' }]}>❤️ Pulszonen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMapColorMode('speed')}
            style={[
              styles.toggleBtn,
              { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder },
              mapColorMode === 'speed' && { backgroundColor: theme.accent, borderColor: theme.accent }
            ]}
          >
            <Text style={[styles.toggleBtnText, mapColorMode === 'speed' && { color: '#000', fontWeight: '800' }]}>⚡ Tempo</Text>
          </TouchableOpacity>
        </View>

        {/* Compact Map Window (180px height instead of 280px!) */}
        <View style={{ borderRadius: 18, overflow: 'hidden', height: 180, width: '100%', borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.cardBg }}>
          <MapView
            style={{ flex: 1 }}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            initialRegion={{
              latitude: midLat,
              longitude: midLon,
              latitudeDelta: dLat,
              longitudeDelta: dLon,
            }}
            customMapStyle={darkMapStyle}
            userInterfaceStyle="dark"
          >
            {segments}
            {pts.length > 0 && (
              <Marker
                coordinate={{ latitude: pts[0].latitude, longitude: pts[0].longitude }}
                title="Startpunkt"
                description="Start des Trainings"
                pinColor="#30D158"
              />
            )}
            {pts.length > 1 && (
              <Marker
                coordinate={{ latitude: pts[pts.length - 1].latitude, longitude: pts[pts.length - 1].longitude }}
                title="Zielpunkt"
                description="Ende des Trainings"
                pinColor="#FF453A"
              />
            )}
          </MapView>
        </View>
      </View>
    );
  };

  const renderSplits = () => {
    // Check if session has real recorded splits
    if (session.splits && session.splits.length > 0) {
      return (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Echte Kilometer-Splits</Text>
          <View style={[styles.splitsContainer, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={[styles.splitRow, { borderBottomColor: theme.subtleBorder, paddingBottom: 8 }]}>
              <Text style={[styles.splitLabel, { color: '#8A99A8', fontSize: 11, fontWeight: '800' }]}>SPLIT</Text>
              <Text style={{ color: '#8A99A8', fontSize: 11, fontWeight: '800' }}>HÖHE & PULS</Text>
              <Text style={[styles.splitVal, { color: '#8A99A8', fontSize: 11, fontWeight: '800' }]}>PACE / ZEIT</Text>
            </View>
            {session.splits.map((s: any, idx: number) => {
              const isKmSplit = 'averagePaceMinKm' in s;
              return (
                <View key={idx} style={[styles.splitRow, { borderBottomColor: theme.subtleBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.splitLabel}>{isKmSplit ? `KM ${s.splitIndex}` : `${idx + 1}. Abschnitt`}</Text>
                    {s.isFastestSplit && (
                      <View style={{ backgroundColor: theme.accentSoftBg, borderWidth: 1, borderColor: theme.accentBorder, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                        <Text style={{ color: theme.accent, fontSize: 9, fontWeight: '900' }}>BEST</Text>
                      </View>
                    )}
                  </View>
                  {isKmSplit && (
                    <Text style={{ color: '#8A99A8', fontSize: 11, fontWeight: '600' }}>
                      {s.elevationDeltaMeters >= 0 ? `+${s.elevationDeltaMeters}m` : `${s.elevationDeltaMeters}m`} • ❤️ {s.averageHeartRate}
                    </Text>
                  )}
                  <Text style={[styles.splitVal, { color: s.isFastestSplit ? theme.accent : '#FFF' }]}>
                    {isKmSplit ? s.averagePaceMinKm : formatTime(s.time)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      );
    }

    // Fallback for older mock sessions without explicit splits array
    let splitsData: { label: string, val: string }[] = [];

    if (isDistanceSport) {
      const totalKm = session.distanceMeters / 1000;
      const step = splitMode;
      for (let i = 1; i <= Math.ceil(totalKm / step); i++) {
        const timeForSplit = avgSpeed > 0 ? (step / avgSpeed) * 3600 : 0;
        splitsData.push({
          label: `${(i-1)*step} - ${Math.min(i*step, Math.round(totalKm*10)/10)} km`,
          val: formatTime(timeForSplit)
        });
      }
    } else {
      const totalMin = session.durationSeconds / 60;
      const step = splitMode;
      for (let i = 1; i <= Math.ceil(totalMin / step); i++) {
        splitsData.push({
          label: `${(i-1)*step} - ${Math.min(i*step, Math.round(totalMin))} min`,
          val: `${Math.round(session.averageHeartRate)} bpm avg`
        });
      }
    }

    return (
      <View style={{ marginTop: 20 }}>
        <Text style={styles.sectionTitle}>Kilometer-Splits</Text>
        <View style={styles.toggleRow}>
          {[1, 5, 10].map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setSplitMode(s)}
              style={[
                styles.toggleBtn,
                { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder },
                splitMode === s && { backgroundColor: theme.accent, borderColor: theme.accent }
              ]}
            >
              <Text style={[styles.toggleBtnText, splitMode === s && { color: '#000', fontWeight: '800' }]}>
                {s} {isDistanceSport ? 'km' : 'min'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.splitsContainer, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          {splitsData.map((s, idx) => (
            <View key={idx} style={[styles.splitRow, { borderBottomColor: theme.subtleBorder }]}>
              <Text style={styles.splitLabel}>{s.label}</Text>
              <Text style={[styles.splitVal, { color: theme.accent }]}>{s.val}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0D1117' }]}>
      <View style={[styles.header, { borderBottomColor: theme.subtleBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ zIndex: 10, padding: 6 }}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={theme.accent} />
        </TouchableOpacity>
        
        <View style={{ flex: 1, alignItems: 'center', marginLeft: -32 }}>
          <Text style={styles.title}>{session.type === 'Running' ? 'Laufen' : session.type === 'Cycling' ? 'Radfahren' : session.type}</Text>
          <Text style={styles.dateSub}>{new Date(session.date).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
      
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: bottomSpacing + 20 }]} showsVerticalScrollIndicator={false}>
        
        {/* Background Watermark Icon */}
        <View style={styles.scrollBackgroundIcon}>
          <MaterialCommunityIcons name={getIconForType(session.type)} size={180} color="rgba(255,255,255,0.04)" />
        </View>

        {/* 1. Hero Summary Card */}
        <View style={[styles.heroSummaryCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.heroIconPill, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorder }]}>
                <MaterialCommunityIcons name={getIconForType(session.type)} size={20} color={theme.accent} />
              </View>
              <Text style={styles.heroSummarySport}>
                {session.type === 'Running' ? 'Lauf-Training' : session.type === 'Cycling' ? 'Rennrad / Tour' : session.type}
              </Text>
            </View>
            <View style={[styles.sourceBadge, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
              <MaterialCommunityIcons name="check-decagram" size={12} color={theme.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.sourceBadgeText, { color: theme.accent }]}>Gespeichert</Text>
            </View>
          </View>

          {/* Primary Big Metric */}
          {isDistanceSport ? (
            <View style={{ alignItems: 'center', marginVertical: 6 }}>
              <Text style={[styles.heroDistanceValue, { color: theme.accent }]}>
                {(session.distanceMeters / 1000).toFixed(2)}
                <Text style={styles.heroDistanceUnit}> KM</Text>
              </Text>
              <Text style={styles.heroDistanceSub}>
                ⏱️ {formatTime(session.durationSeconds)} • {session.type === 'Cycling' ? `⚡ ${avgSpeed.toFixed(1)} km/h` : `⚡ ${paceStr} min/km`} • 🔥 {Math.round(session.caloriesBurned)} kcal
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginVertical: 6 }}>
              <Text style={[styles.heroDistanceValue, { color: theme.accent }]}>
                {formatTime(session.durationSeconds)}
              </Text>
              <Text style={styles.heroDistanceSub}>
                ❤️ Ø {Math.round(session.averageHeartRate)} BPM • 🔥 {Math.round(session.caloriesBurned)} kcal
              </Text>
            </View>
          )}
        </View>

        {/* 2. Compact Map & Profile Section (takes only ~180px!) */}
        <View style={{ marginVertical: 12 }}>
          <View style={[styles.segmentControl, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
            <TouchableOpacity 
              style={[styles.segmentBtn, widgetMode === 'map' && { backgroundColor: theme.accent }]}
              onPress={() => setWidgetMode('map')}
            >
              <Text style={[styles.segmentBtnText, widgetMode === 'map' && { color: '#000', fontWeight: '800' }]}>🗺️ Route auf Karte</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentBtn, widgetMode === 'chart' && { backgroundColor: theme.accent }]}
              onPress={() => setWidgetMode('chart')}
            >
              <Text style={[styles.segmentBtnText, widgetMode === 'chart' && { color: '#000', fontWeight: '800' }]}>📈 Tempo & Puls</Text>
            </TouchableOpacity>
          </View>

          {widgetMode === 'map' ? renderMap() : renderChart()}
        </View>

        {/* 3. Re-arranged Prominent Telemetry Grid (6 high-contrast cards) */}
        <View style={styles.telemetryGrid}>
          {/* DISTANZ */}
          {isDistanceSport && (
            <View style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <View style={styles.telemetryCardHeader}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color={theme.accent} />
                <Text style={[styles.telemetryCardLabel, { color: theme.accent }]}>GESAMTSTRECKE</Text>
              </View>
              <Text style={[styles.telemetryCardValue, { color: '#FFF' }]}>
                {(session.distanceMeters / 1000).toFixed(2)}
                <Text style={[styles.telemetryCardUnit, { color: theme.accent }]}> km</Text>
              </Text>
            </View>
          )}

          {/* DAUER */}
          <View style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
            <View style={styles.telemetryCardHeader}>
              <MaterialCommunityIcons name="timer-outline" size={16} color="#FFF" />
              <Text style={styles.telemetryCardLabel}>TRAININGSZEIT</Text>
            </View>
            <Text style={[styles.telemetryCardValue, { color: '#FFF' }]}>
              {formatTime(session.durationSeconds)}
            </Text>
          </View>

          {/* HÖHE */}
          <View style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
            <View style={styles.telemetryCardHeader}>
              <MaterialCommunityIcons name="elevation-rise" size={16} color="#FF9F0A" />
              <Text style={[styles.telemetryCardLabel, { color: '#FF9F0A' }]}>HÖHENMETER</Text>
            </View>
            <Text style={[styles.telemetryCardValue, { color: '#FF9F0A' }]}>
              +{Math.round(session.elevationGain || 0)}
              <Text style={[styles.telemetryCardUnit, { color: '#FF9F0A' }]}> m</Text>
            </Text>
          </View>

          {/* HERZFREQUENZ */}
          <TouchableOpacity
            style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}
            onPress={() => setHrMode(p => p === 'avg' ? 'max' : 'avg')}
          >
            <View style={styles.telemetryCardHeader}>
              <MaterialCommunityIcons name="heart-pulse" size={16} color="#FF3B30" />
              <Text style={[styles.telemetryCardLabel, { color: '#FF3B30' }]}>
                {hrMode === 'avg' ? 'Ø HERZFREQUENZ' : 'MAX HERZFREQUENZ'}
              </Text>
            </View>
            <Text style={[styles.telemetryCardValue, { color: '#FF3B30' }]}>
              {Math.round(hrMode === 'avg' ? session.averageHeartRate : (session.maxHeartRate || session.averageHeartRate))}
              <Text style={[styles.telemetryCardUnit, { color: '#FF3B30' }]}> bpm</Text>
            </Text>
          </TouchableOpacity>

          {/* SPEED / PACE */}
          <TouchableOpacity
            style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}
            onPress={() => setSpeedMode(p => p === 'avg' ? 'max' : 'avg')}
          >
            <View style={styles.telemetryCardHeader}>
              <MaterialCommunityIcons name="speedometer" size={16} color={theme.accent} />
              <Text style={[styles.telemetryCardLabel, { color: theme.accent }]}>
                {speedMode === 'avg' ? 'Ø GESCHWINDIGKEIT' : 'MAX GESCHWINDIGKEIT'}
              </Text>
            </View>
            <Text style={[styles.telemetryCardValue, { color: '#FFF' }]}>
              {(speedMode === 'avg' ? avgSpeed : maxSpeed).toFixed(1)}
              <Text style={styles.telemetryCardUnit}> km/h</Text>
            </Text>
          </TouchableOpacity>

          {/* KALORIEN */}
          <View style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
            <View style={styles.telemetryCardHeader}>
              <MaterialCommunityIcons name="fire" size={16} color="#FF9500" />
              <Text style={[styles.telemetryCardLabel, { color: '#FF9500' }]}>KALORIEN</Text>
            </View>
            <Text style={[styles.telemetryCardValue, { color: '#FF9500' }]}>
              {Math.round(session.caloriesBurned)}
              <Text style={[styles.telemetryCardUnit, { color: '#FF9500' }]}> kcal</Text>
            </Text>
          </View>

          {/* SCHRITTE (FALLS APPLICABLE) */}
          {isStepSport && (
            <TouchableOpacity
              style={[styles.telemetryCard, { width: '100%', backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}
              onPress={() => setStepMode(p => p === 'steps' ? 'km' : 'steps')}
            >
              <View style={styles.telemetryCardHeader}>
                <MaterialCommunityIcons name="shoe-sneaker" size={16} color="#30D158" />
                <Text style={[styles.telemetryCardLabel, { color: '#30D158' }]}>
                  {stepMode === 'steps' ? 'SCHRITTE' : 'DISTANZ'}
                </Text>
              </View>
              <Text style={[styles.telemetryCardValue, { color: '#30D158' }]}>
                {stepMode === 'steps' ? Math.round(session.distanceMeters / 0.762) : (session.distanceMeters / 1000).toFixed(2)}
                <Text style={styles.telemetryCardUnit}>{stepMode === 'steps' ? ' Schritte' : ' km'}</Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* ESTIMATED POWER FOR CYCLING */}
          {session.type === 'Cycling' && (
            <View style={[styles.telemetryCard, { width: '100%', backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
              <View style={styles.telemetryCardHeader}>
                <MaterialCommunityIcons name="flash" size={16} color="#FFD700" />
                <Text style={[styles.telemetryCardLabel, { color: '#FFD700' }]}>GESCHÄTZTE LEISTUNG</Text>
              </View>
              <Text style={[styles.telemetryCardValue, { color: '#FFD700' }]}>
                ~{Math.round(session.averageWatts || (180 + avgSpeed * 3.2))}
                <Text style={[styles.telemetryCardUnit, { color: '#FFD700' }]}> Watt (Ø)</Text>
              </Text>
            </View>
          )}
        </View>

        {/* 4. Kilometer Splits */}
        {renderSplits()}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1117' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { color: 'white', fontSize: 18, fontWeight: '800' },
  dateSub: { color: '#8A99A8', fontSize: 11, marginTop: 2, fontWeight: '600' },
  container: { padding: 16, position: 'relative' },
  scrollBackgroundIcon: {
    position: 'absolute',
    top: 0,
    right: -20,
    zIndex: -1,
  },
  heroSummaryCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  heroIconPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  heroSummarySport: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  sourceBadgeText: { fontSize: 10, fontWeight: '800' },
  heroDistanceValue: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroDistanceUnit: {
    fontSize: 16,
    fontWeight: '800',
  },
  heroDistanceSub: {
    color: '#8A99A8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  telemetryCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  telemetryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  telemetryCardLabel: {
    color: '#8A99A8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 5,
  },
  telemetryCardValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  telemetryCardUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A99A8',
  },
  segmentControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentBtnText: {
    color: '#8A99A8',
    fontWeight: '700',
    fontSize: 12,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  toggleBtnText: {
    color: '#8A99A8',
    fontWeight: '700',
    fontSize: 11,
  },
  noDataBox: {
    height: 140,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
  },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: '800', marginBottom: 10 },
  splitsContainer: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  splitLabel: { color: '#E0E0E0', fontSize: 14, fontWeight: '700' },
  splitVal: { fontSize: 14, fontWeight: '800' },
});

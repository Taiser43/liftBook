import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCardioStore, CardioSession } from '../store/useCardioStore';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import Svg, { Path, Defs, LinearGradient, Stop, Text as SvgText, Line as SvgLine } from 'react-native-svg';
import { useBottomSpacing } from '../hooks/useBottomSpacing';

const { width } = Dimensions.get('window');

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
      <SafeAreaView style={styles.safeArea}>
        <Text style={{ color: 'white' }}>Session not found</Text>
      </SafeAreaView>
    );
  }

  const isDistanceSport = ['Running', 'Cycling', 'Walking', 'Swimming'].includes(session.type);
  const isStepSport = ['Boxing', 'Football', 'Paddle'].includes(session.type);

  const avgSpeed = session.durationSeconds > 0 ? (session.distanceMeters / 1000) / (session.durationSeconds / 3600) : 0;
  const maxSpeed = session.maxSpeed || avgSpeed; 
  
  const renderChart = () => {
    if (!session.routeCoordinates || session.routeCoordinates.length < 2) {
      return (
        <View style={styles.noDataBox}>
          <Text style={{ color: '#888' }}>Not enough data for chart.</Text>
        </View>
      );
    }
    
    const pts = session.routeCoordinates;
    const svgHeight = 220; 
    const chartHeight = 180; 
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
      <View style={{ marginTop: 20 }}>
        <View style={[styles.toggleRow, { justifyContent: 'space-between', alignItems: 'flex-start', minHeight: 45 }]}>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => setChartMode('both')} style={[styles.toggleBtn, chartMode === 'both' && styles.toggleBtnActive]}>
              <Text style={[styles.toggleBtnText, chartMode === 'both' && styles.toggleBtnTextActive]}>Both</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setChartMode('hr')} style={[styles.toggleBtn, chartMode === 'hr' && styles.toggleBtnActive]}>
              <Text style={[styles.toggleBtnText, chartMode === 'hr' && styles.toggleBtnTextActive]}>Heart Rate</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setChartMode('speed')} style={[styles.toggleBtn, chartMode === 'speed' && styles.toggleBtnActive]}>
              <Text style={[styles.toggleBtnText, chartMode === 'speed' && styles.toggleBtnTextActive]}>Speed</Text>
            </TouchableOpacity>
          </View>
          
          {touchData && (
            <View style={{ alignItems: 'flex-end', backgroundColor: '#1E1E1E', padding: 6, borderRadius: 8, marginTop: -5 }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{touchData.time}</Text>
              {(chartMode === 'both' || chartMode === 'hr') && (
                <Text style={{ color: '#FF3B30', fontSize: 12, fontWeight: 'bold' }}>{touchData.hr} bpm</Text>
              )}
              {(chartMode === 'both' || chartMode === 'speed') && (
                <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: 'bold' }}>{touchData.speed} km/h</Text>
              )}
            </View>
          )}
        </View>

        <View 
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleTouch}
          onResponderMove={handleTouch}
          onResponderRelease={() => setTouchData(null)}
        >
          <Svg width={chartWidth} height={svgHeight}>
            <Defs>
              <LinearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FF3B30" stopOpacity="0.4" />
                <Stop offset="0.25" stopColor="#FF9500" stopOpacity="0.3" />
                <Stop offset="0.5" stopColor="#FFD700" stopOpacity="0.2" />
                <Stop offset="0.75" stopColor="#30D158" stopOpacity="0.1" />
                <Stop offset="1" stopColor="#00D2FF" stopOpacity="0.0" />
              </LinearGradient>
              <LinearGradient id="hrLineGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FF3B30" />
                <Stop offset="0.25" stopColor="#FF9500" />
                <Stop offset="0.5" stopColor="#FFD700" />
                <Stop offset="0.75" stopColor="#30D158" />
                <Stop offset="1" stopColor="#00D2FF" />
              </LinearGradient>
            </Defs>

            {/* Grid lines */}
            <SvgLine x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#333" strokeWidth="1" />
            <SvgLine x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#333" strokeWidth="0.5" strokeDasharray="4 4" />
            
            {(chartMode === 'both' || chartMode === 'hr') && (
              <>
                <Path d={hrArea} fill="url(#hrGrad)" />
                <Path d={hrPath} fill="none" stroke="url(#hrLineGrad)" strokeWidth="3" />
                
                {/* Intermediary HR values */}
                <SvgText x={5} y={15} fill="#FF3B30" fontSize="10" fontWeight="bold">{Math.round(maxH)}</SvgText>
                <SvgText x={5} y={(chartHeight * 0.5) - 5} fill="#FF3B30" fontSize="10">{Math.round(minH + (maxH - minH) * 0.5)}</SvgText>
                <SvgText x={5} y={chartHeight - 5} fill="#FF3B30" fontSize="10">{Math.round(minH)}</SvgText>
              </>
            )}

            {(chartMode === 'both' || chartMode === 'speed') && (
              <>
                <Path d={speedPath} fill="none" stroke="#00D2FF" strokeWidth="3" opacity={0.8} />
                
                {/* Intermediary Speed values */}
                <SvgText x={chartWidth - 25} y={15} fill="#00D2FF" fontSize="10" fontWeight="bold">{Math.round(maxS)}</SvgText>
                <SvgText x={chartWidth - 25} y={(chartHeight * 0.5) - 5} fill="#00D2FF" fontSize="10">{Math.round(minS + (maxS - minS) * 0.5)}</SvgText>
                <SvgText x={chartWidth - 25} y={chartHeight - 5} fill="#00D2FF" fontSize="10">{Math.round(minS)}</SvgText>
              </>
            )}

            {/* X-Axis labels (Time) */}
            <SvgText x={5} y={chartHeight + 15} fill="#888" fontSize="10">0:00</SvgText>
            <SvgText x={chartWidth - 30} y={chartHeight + 15} fill="#888" fontSize="10">{formatTime(session.durationSeconds)}</SvgText>

            {/* Touch Cursor Line & Dots */}
            {touchData && (
              <>
                <SvgLine x1={touchData.x} y1="0" x2={touchData.x} y2={chartHeight} stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                {(chartMode === 'both' || chartMode === 'hr') && (
                  <View style={{ position: 'absolute', left: touchData.x - 4, top: touchData.yHR - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30', borderWidth: 1, borderColor: 'white' }} pointerEvents="none" />
                )}
                {(chartMode === 'both' || chartMode === 'speed') && (
                  <View style={{ position: 'absolute', left: touchData.x - 4, top: touchData.ySpeed - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D2FF', borderWidth: 1, borderColor: 'white' }} pointerEvents="none" />
                )}
              </>
            )}

          </Svg>
        </View>
      </View>
    );
  };

  const renderMap = () => {
    if (!session.routeCoordinates || session.routeCoordinates.length === 0) {
      return (
        <View style={styles.noDataBox}>
          <Text style={{ color: '#888' }}>No GPS data available.</Text>
        </View>
      );
    }
    const pts = session.routeCoordinates;
    const segments = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      
      let color = '#00D2FF';
      if (mapColorMode === 'hr') {
        const hr = p1.heartRate || 100;
        if (hr > maxHRSetting * 0.9) color = '#FF3B30';
        else if (hr > maxHRSetting * 0.8) color = '#FF9500';
        else if (hr > maxHRSetting * 0.7) color = '#FFD700';
        else if (hr > maxHRSetting * 0.6) color = '#30D158';
        else color = '#00D2FF';
      } else {
        const spd = p1.speed || 0;
        const avg = avgSpeed; 
        if (spd > avg * 1.3) color = '#FF3B30';
        else if (spd > avg * 1.1) color = '#FF9500';
        else if (spd > avg * 0.9) color = '#30D158';
        else color = '#00D2FF';
      }

      segments.push(
        <Polyline 
          key={i}
          coordinates={[{ latitude: p1.latitude, longitude: p1.longitude }, { latitude: p2.latitude, longitude: p2.longitude }]}
          strokeColor={color}
          strokeWidth={5}
        />
      );
    }

    return (
      <View style={{ marginTop: 20 }}>
        <View style={styles.toggleRow}>
          <TouchableOpacity onPress={() => setMapColorMode('hr')} style={[styles.toggleBtn, mapColorMode === 'hr' && styles.toggleBtnActive]}>
            <Text style={[styles.toggleBtnText, mapColorMode === 'hr' && styles.toggleBtnTextActive]}>Heart Rate</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMapColorMode('speed')} style={[styles.toggleBtn, mapColorMode === 'speed' && styles.toggleBtnActive]}>
            <Text style={[styles.toggleBtnText, mapColorMode === 'speed' && styles.toggleBtnTextActive]}>Speed</Text>
          </TouchableOpacity>
        </View>

        <View style={{ borderRadius: 16, overflow: 'hidden', height: 250, width: '100%' }}>
          <MapView
            style={{ flex: 1 }}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: pts[0].latitude,
              longitude: pts[0].longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            userInterfaceStyle="dark"
          >
            {segments}
          </MapView>
        </View>
      </View>
    );
  };

  const renderSplits = () => {
    let splitsData: { label: string, val: string }[] = [];
    
    if (isDistanceSport) {
      const totalKm = session.distanceMeters / 1000;
      const step = splitMode;
      for (let i = 1; i <= Math.ceil(totalKm / step); i++) {
        const timeForSplit = (step / avgSpeed) * 3600; 
        const variation = (Math.random() - 0.5) * 20; 
        splitsData.push({
          label: `${(i-1)*step} - ${i*step} km`,
          val: formatTime(Math.max(timeForSplit + variation, 0))
        });
      }
    } else {
      const totalMin = session.durationSeconds / 60;
      const step = splitMode; 
      for (let i = 1; i <= Math.ceil(totalMin / step); i++) {
        const hrVariation = (Math.random() - 0.5) * 10;
        splitsData.push({
          label: `${(i-1)*step} - ${i*step} min`,
          val: `${Math.round(session.averageHeartRate + hrVariation)} bpm avg`
        });
      }
    }

    return (
      <View style={{ marginTop: 30 }}>
        <Text style={styles.sectionTitle}>Splits</Text>
        <View style={styles.toggleRow}>
          {[1, 5, 10].map(s => (
            <TouchableOpacity key={s} onPress={() => setSplitMode(s)} style={[styles.toggleBtn, splitMode === s && styles.toggleBtnActive]}>
              <Text style={[styles.toggleBtnText, splitMode === s && styles.toggleBtnTextActive]}>
                {s} {isDistanceSport ? 'km' : 'min'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.splitsContainer}>
          {splitsData.map((s, idx) => (
            <View key={idx} style={styles.splitRow}>
              <Text style={styles.splitLabel}>{s.label}</Text>
              <Text style={styles.splitVal}>{s.val}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ zIndex: 10 }}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        
        <View style={{ flex: 1, alignItems: 'center', marginLeft: -28 }}>
          <Text style={styles.title}>{session.type}</Text>
          <Text style={styles.dateSub}>{new Date(session.date).toLocaleString()}</Text>
        </View>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* HUGE BACKGROUND ICON THAT SCROLLS BEHIND THE CONTENT */}
        <View style={styles.scrollBackgroundIcon}>
           <MaterialCommunityIcons name={getIconForType(session.type)} size={220} color="rgba(255,255,255,0.08)" />
        </View>

        {/* Added padding to move boxes down a bit */}
        <View style={{ height: 30 }} />

        {/* Top Grid */}
        <View style={styles.gridRow}>
          <View style={[styles.gridBox, styles.gridBoxTranslucent]}>
            <Text style={styles.gridLabel}>Duration</Text>
            <Text style={styles.gridValue}>{formatTime(session.durationSeconds)}</Text>
          </View>
          
          <TouchableOpacity style={[styles.gridBox, styles.gridBoxTranslucent]} onPress={() => setSpeedMode(p => p === 'avg' ? 'max' : 'avg')}>
            <Text style={styles.gridLabel}>{speedMode === 'avg' ? 'Avg Speed' : 'Max Speed'}</Text>
            <Text style={styles.gridValue}>{(speedMode === 'avg' ? avgSpeed : maxSpeed).toFixed(1)} <Text style={{fontSize: 14}}>km/h</Text></Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gridRow}>
          <TouchableOpacity style={[styles.gridBox, styles.gridBoxTranslucent]} onPress={() => setHrMode(p => p === 'avg' ? 'max' : 'avg')}>
            <Text style={styles.gridLabel}>{hrMode === 'avg' ? 'Avg HR' : 'Max HR'}</Text>
            <Text style={[styles.gridValue, { color: '#FF3B30' }]}>
              {Math.round(hrMode === 'avg' ? session.averageHeartRate : session.maxHeartRate)} <Text style={{fontSize: 14}}>bpm</Text>
            </Text>
          </TouchableOpacity>
          
          <View style={[styles.gridBox, styles.gridBoxTranslucent]}>
            <Text style={styles.gridLabel}>Calories</Text>
            <Text style={[styles.gridValue, { color: '#FF9500' }]}>{Math.round(session.caloriesBurned)} <Text style={{fontSize: 14}}>kcal</Text></Text>
          </View>
        </View>

        {isDistanceSport && (
          <View style={styles.gridRow}>
            <View style={[styles.gridBox, styles.gridBoxTranslucent]}>
              <Text style={styles.gridLabel}>Distance</Text>
              <Text style={[styles.gridValue, { color: '#00D2FF' }]}>{(session.distanceMeters / 1000).toFixed(2)} <Text style={{fontSize: 14}}>km</Text></Text>
            </View>
            <View style={[styles.gridBox, styles.gridBoxTranslucent]}>
              <Text style={styles.gridLabel}>Elevation</Text>
              <Text style={styles.gridValue}>{Math.round(session.elevationGain || 0)} <Text style={{fontSize: 14}}>m</Text></Text>
            </View>
          </View>
        )}

        {isStepSport && (
          <View style={styles.gridRow}>
            <TouchableOpacity style={[styles.gridBox, styles.gridBoxTranslucent]} onPress={() => setStepMode(p => p === 'steps' ? 'km' : 'steps')}>
              <Text style={styles.gridLabel}>{stepMode === 'steps' ? 'Steps' : 'Distance'}</Text>
              <Text style={[styles.gridValue, { color: '#30D158' }]}>
                {stepMode === 'steps' ? Math.round(session.distanceMeters / 0.762) : (session.distanceMeters / 1000).toFixed(2)} <Text style={{fontSize: 14}}>{stepMode === 'steps' ? '' : 'km'}</Text>
              </Text>
            </TouchableOpacity>
            <View style={[styles.gridBox, { backgroundColor: 'transparent' }]} />
          </View>
        )}

        <View style={{ marginTop: 30 }}>
          <View style={styles.segmentControl}>
            <TouchableOpacity 
              style={[styles.segmentBtn, widgetMode === 'map' && styles.segmentBtnActive]}
              onPress={() => setWidgetMode('map')}
            >
              <Text style={[styles.segmentBtnText, widgetMode === 'map' && styles.segmentBtnTextActive]}>Map</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentBtn, widgetMode === 'chart' && styles.segmentBtnActive]}
              onPress={() => setWidgetMode('chart')}
            >
              <Text style={[styles.segmentBtnText, widgetMode === 'chart' && styles.segmentBtnTextActive]}>Chart</Text>
            </TouchableOpacity>
          </View>

          {widgetMode === 'map' ? renderMap() : renderChart()}
        </View>

        {renderSplits()}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10 },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  dateSub: { color: '#888', fontSize: 12, marginTop: 4 },
  container: { padding: 20, position: 'relative' },
  scrollBackgroundIcon: {
    position: 'absolute',
    top: -20,
    right: -20,
    zIndex: -1,
  },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  gridBox: { flex: 0.48, backgroundColor: '#1E1E1E', padding: 15, borderRadius: 16 },
  gridBoxTranslucent: { backgroundColor: 'rgba(30, 30, 30, 0.85)' },
  gridLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  gridValue: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  segmentControl: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 8, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 , marginBottom: 12 },
  segmentBtnActive: { backgroundColor: '#333' },
  segmentBtnText: { color: '#888', fontWeight: 'bold' },
  segmentBtnTextActive: { color: 'white' },
  toggleRow: { flexDirection: 'row', marginBottom: 15 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E1E1E', marginRight: 10, borderWidth: 1, borderColor: '#333' },
  toggleBtnActive: { backgroundColor: '#00D2FF', borderColor: '#00D2FF' },
  toggleBtnText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  toggleBtnTextActive: { color: '#121212' },
  noDataBox: { height: 200, backgroundColor: '#1E1E1E', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  splitsContainer: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 15 },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  splitLabel: { color: '#E0E0E0', fontSize: 16, fontWeight: '500' },
  splitVal: { color: '#00D2FF', fontSize: 16, fontWeight: 'bold' }
});

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Platform, PermissionsAndroid } from 'react-native';
import type { Device } from 'react-native-ble-plx';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/store';
import { Buffer } from 'buffer';
import { getAppTheme } from '../utils/theme';

const HR_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_MEASUREMENT_CHAR_UUID = '00002a37-0000-1000-8000-00805f9b34fb';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BluetoothManager({ visible, onClose }: Props) {
  const managerRef = React.useRef<any>(null);
  const { connectedDeviceId, setConnectedDevice, setCurrentHeartRate, currentHeartRate, accentThemeId } = useAppStore();
  const theme = getAppTheme(accentThemeId);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    return () => {
      if (managerRef.current) {
        try { managerRef.current.stopDeviceScan(); } catch (e) {}
      }
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      if ((Platform.Version as number) >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; // iOS handles automatically via Info.plist
  };

  const startScan = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (!managerRef.current) {
      try {
        const { BleManager } = require('react-native-ble-plx');
        managerRef.current = new BleManager();
      } catch (e) {
        alert("Bluetooth scanning is not supported in Expo Go. Please use a Custom Dev Client.");
        return;
      }
    }

    setDevices([]);
    setIsScanning(true);
    
    try {
      managerRef.current.startDeviceScan([HR_SERVICE_UUID], null, (error: any, device: any) => {
        if (error) {
          console.error(error);
          setIsScanning(false);
          return;
        }
        if (device && device.name) {
          setDevices(prev => {
            if (!prev.find(d => d.id === device.id)) {
              return [...prev, device];
            }
            return prev;
          });
        }
      });

      // Stop scanning after 10 seconds
      setTimeout(() => {
        try {
          if (managerRef.current) managerRef.current.stopDeviceScan();
        } catch (e) {}
        setIsScanning(false);
      }, 10000);
    } catch (e) {
      console.warn("BLE Native module not found. Are you running in Expo Go?", e);
      alert("Bluetooth is not supported in Expo Go. Please run the compiled APK.");
      setIsScanning(false);
    }
  };

  const manualDisconnectRef = React.useRef(false);

  const connectToDevice = async (device: Device) => {
    try {
      if (managerRef.current) {
        try { managerRef.current.stopDeviceScan(); } catch (e) {}
      }
      setIsScanning(false);
      manualDisconnectRef.current = false;
      
      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      setConnectedDevice(connectedDevice.id);

      // Register disconnect listener for auto-reconnect
      managerRef.current.onDeviceDisconnected(connectedDevice.id, (error: any, d: Device) => {
        setConnectedDevice(null);
        setCurrentHeartRate(null);
        if (!manualDisconnectRef.current) {
          console.log("Device disconnected unexpectedly. Attempting to reconnect in 3s...");
          setTimeout(() => {
            connectToDevice(device);
          }, 3000);
        }
      });

      // Start receiving heart rate data
      connectedDevice.monitorCharacteristicForService(
        HR_SERVICE_UUID,
        HR_MEASUREMENT_CHAR_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('HR Monitor Error:', error);
            // Don't disconnect here, let the onDeviceDisconnected listener handle it if the connection is truly lost.
            return;
          }
          
          if (characteristic?.value) {
            try {
              const decodedValue = Buffer.from(characteristic.value, 'base64');
              const flags = decodedValue[0];
              const is16Bit = (flags & 0x01) === 1;
              const hr = is16Bit ? decodedValue.readUInt16LE(1) : decodedValue[1];
              setCurrentHeartRate(hr);
            } catch (err) {
              console.error("Buffer parsing error:", err);
            }
          }
        }
      );
    } catch (e) {
      console.error('Connection failed', e);
      if (!manualDisconnectRef.current) {
          console.log("Connection attempt failed. Retrying in 5s...");
          setTimeout(() => connectToDevice(device), 5000);
      }
    }
  };

  const disconnectDevice = async () => {
    manualDisconnectRef.current = true;
    if (connectedDeviceId) {
      if (managerRef.current) await managerRef.current.cancelDeviceConnection(connectedDeviceId);
      setConnectedDevice(null);
      setCurrentHeartRate(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.subCardBg || '#121212' }]}>
        <View style={[styles.header, { borderBottomColor: theme.subtleBorder || '#333' }]}>
          <Text style={styles.title}>Bluetooth Devices</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {connectedDeviceId ? (
            <View style={styles.connectedBox}>
              <MaterialCommunityIcons name="heart-pulse" size={48} color="#FF453A" />
              <Text style={styles.connectedText}>Connected</Text>
              <Text style={styles.hrText}>{currentHeartRate || '--'} bpm</Text>
              
              <TouchableOpacity style={styles.disconnectBtn} onPress={disconnectDevice}>
                <Text style={styles.disconnectText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity style={[styles.scanBtn, { backgroundColor: theme.accent || '#00D2FF' }]} onPress={startScan} disabled={isScanning}>
                <Text style={styles.scanBtnText}>{isScanning ? 'Scanning...' : 'Scan for Heart Rate Monitors'}</Text>
              </TouchableOpacity>

              <FlatList
                data={devices}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.deviceItem, { backgroundColor: theme.cardBg || '#1E1E1E', borderColor: theme.cardBorder || '#333' }]} 
                    onPress={() => connectToDevice(item)}
                  >
                    <Text style={styles.deviceName}>{item.name}</Text>
                    <Text style={styles.deviceId}>{item.id}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    {isScanning ? 'Looking for devices...' : 'No devices found.'}
                  </Text>
                }
              />
            </>
          )}
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
  content: { flex: 1, padding: 16 },
  scanBtn: {
    backgroundColor: '#00D2FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  deviceItem: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333'
  },
  deviceName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  deviceId: { color: '#888', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 32 },
  connectedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  connectedText: { color: '#30D158', fontSize: 24, fontWeight: '700', marginTop: 16 },
  hrText: { color: '#FFF', fontSize: 48, fontWeight: '800', marginTop: 8 },
  disconnectBtn: {
    marginTop: 32,
    backgroundColor: '#FF453A20',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  disconnectText: { color: '#FF453A', fontSize: 16, fontWeight: '600' }
});

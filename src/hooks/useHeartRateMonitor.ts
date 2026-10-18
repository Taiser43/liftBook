import { useEffect, useRef } from 'react';
import { requestBlePermissions } from '../utils/blePermissions';
import { useAppStore } from '../store/store';

// Global singleton so it survives component unmounts!
let globalBleManager: any = null;
let scanTimeout: any = null;
let globalDevice: any = null;

export function useHeartRateMonitor() {
  const currentHR = useAppStore(state => state.currentHeartRate) || 0;
  const connectedDeviceId = useAppStore(state => state.connectedDeviceId);
  const setCurrentHR = useAppStore(state => state.setCurrentHeartRate);
  const setConnectedDevice = useAppStore(state => state.setConnectedDevice);

  const isWatchConnected = !!connectedDeviceId;
  
  // We don't want to destroy the BleManager when this hook unmounts!
  // Instead, we just let it live in memory globally.

  const toggleConnection = async () => {
    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      alert('Bluetooth permissions denied.');
      return;
    }

    if (!globalBleManager) {
      try {
        const { BleManager } = require('react-native-ble-plx');
        globalBleManager = new BleManager();
      } catch (e) {
        alert('BLE module not available in this environment (Expo Go).'); 
        return; 
      }
    }
    
    // Toggle off if already connected
    if (isWatchConnected || globalDevice) {
       if (globalDevice) await globalBleManager.cancelDeviceConnection(globalDevice.id);
       setConnectedDevice(null);
       globalDevice = null;
       setCurrentHR(0);
       return;
    }

    alert('Scanning for Heart Rate Monitor (make sure your Watch or Chest Strap is broadcasting)...');
    try {
      const state = await globalBleManager.state();
      if (state !== 'PoweredOn') { alert('Bluetooth is not powered on'); return; }
      
      // We pass null instead of ['180D'] because some watches (like Galaxy Watch) 
      // don't advertise the 180D UUID in their very first small broadcast packet!
      globalBleManager.startDeviceScan(null, null, async (error: any, device: any) => {
        if (error) { console.warn(error); return; }
        
        // Look for devices that either advertise 180D or have names indicating a heart rate monitor
        const name = (device?.name || device?.localName || '').toLowerCase();
        const hasHRService = device?.serviceUUIDs?.includes('180D') || device?.serviceUUIDs?.includes('0000180d-0000-1000-8000-00805f9b34fb');
        
        if (hasHRService || name.includes('heart') || name.includes('polar') || name.includes('garmin') || name.includes('watch') || name.includes('hrm')) {
          globalBleManager.stopDeviceScan();
          if (scanTimeout) clearTimeout(scanTimeout);

          try {
            const connected = await device.connect();
            await connected.discoverAllServicesAndCharacteristics();
            globalDevice = connected;
            setConnectedDevice(connected.id);
            alert(`Connected to ${device.name || 'Heart Rate Monitor'}!`);
            
            // Monitor the Heart Rate Service (180D) and Measurement Characteristic (2A37)
            connected.monitorCharacteristicForService('180D', '2A37', (err: any, characteristic: any) => {
              if (err) {
                 console.warn(err);
                 setConnectedDevice(null);
                 globalDevice = null;
                 setCurrentHR(0);
                 return;
              }
              if (characteristic?.value) {
                try {
                  const Buffer = require('buffer').Buffer;
                  const buffer = Buffer.from(characteristic.value, 'base64');
                  const flags = buffer[0];
                  const hr16bit = (flags & 1) !== 0;
                  const hrValue = hr16bit ? buffer.readUInt16LE(1) : buffer.readUInt8(1);
                  setCurrentHR(hrValue);
                } catch (e) {
                  console.warn('Error parsing HR data', e);
                }
              }
            });
          } catch (connErr) {
             console.warn('Connection failed', connErr);
             alert('Failed to connect. The device might have been connected to another app.');
          }
        }
      });
      
      // Stop scan after 30 seconds if nothing found (increased from 10s for slow watches)
      scanTimeout = setTimeout(() => {
        if (globalBleManager) globalBleManager.stopDeviceScan();
        if (!globalDevice) alert("Scan timed out. No Heart Rate Monitor found.");
      }, 30000);
      
    } catch (err) {
      console.warn('BLE error', err);
    }
  };

  return { 
    currentHR, 
    isWatchConnected, 
    toggleConnection, 
    setCurrentHR, 
    setIsWatchConnected: (connected: boolean) => {
      if (!connected) {
        setConnectedDevice(null);
        globalDevice = null;
        setCurrentHR(0);
      }
    } 
  };
}

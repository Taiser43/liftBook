const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const oldSync = `  const syncHealthData = async () => {
    try {
      const HealthConnect = require('react-native-health-connect');
      const timeRangeFilter = {
        operator: 'between',
        startTime: new Date(new Date().setHours(0,0,0,0)).toISOString(),
        endTime: new Date().toISOString(),
      };`;

const newSync = `  const syncHealthData = async () => {
    try {
      const HealthConnect = require('react-native-health-connect');
      await HealthConnect.initialize();
      const timeRangeFilter = {
        operator: 'between',
        startTime: new Date(new Date().setHours(0,0,0,0)).toISOString(),
        endTime: new Date().toISOString(),
      };`;

code = code.replace(oldSync, newSync);
fs.writeFileSync('src/screens/HomeScreen.tsx', code);
console.log("Patched syncHealthData");

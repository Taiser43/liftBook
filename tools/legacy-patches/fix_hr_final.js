const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

const target = `      hrInterval = setInterval(() => {
        setHeartRate((prevBpm: number) => {
          let nextBpm = prevBpm || 120;
          
          // If resting, gradually recover towards 115-125
          if (restTimeLeft !== null && restTimeLeft > 0) {
            if (nextBpm > 122) {
              nextBpm -= (Math.random() > 0.4 ? 1 : 0);
            } else {
              nextBpm += (Math.random() > 0.5 ? 1 : -1);
            }
          } else {
            // Slight natural drift during work
            const jitter = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
            nextBpm = Math.max(105, Math.min(176, nextBpm + jitter));
          }

          setHrHistory(history => [...history.slice(-180), nextBpm]);
          return nextBpm;
        });
      }, 1000);`;

const newCode = `      hrInterval = setInterval(() => {
        const currentVal = useAppStore.getState().currentHeartRate || 120;
        let nextBpm = currentVal;
        
        if (restTimeLeft !== null && restTimeLeft > 0) {
          if (nextBpm > 122) {
            nextBpm -= (Math.random() > 0.4 ? 1 : 0);
          } else {
            nextBpm += (Math.random() > 0.5 ? 1 : -1);
          }
        } else {
          const jitter = Math.floor(Math.random() * 3) - 1;
          nextBpm = Math.max(105, Math.min(176, nextBpm + jitter));
        }

        setHeartRate(nextBpm);
        setHrHistory(history => [...history.slice(-180), nextBpm]);
      }, 1000);`;

code = code.replace(target, newCode);
fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log("Replaced using exact string");

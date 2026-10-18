const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

const target1 = `        setHeartRate((prevBpm: number) => {
          let nextBpm = prevBpm || 120;
          
          // If resting, gradually recover towards 115-125
          if (restTimeLeft !== null && restTimeLeft > 0) {
            nextBpm = Math.max(115, nextBpm - (1 + Math.random()));
          } else {
            // Light fluctuations while active
            nextBpm = nextBpm + (Math.random() * 4 - 2);
          }
          
          nextBpm = Math.max(70, Math.min(185, nextBpm));
          setHrHistory(h => [...h, nextBpm]);
          return nextBpm;
        });`;

const newTarget1 = `        const currentVal = useHeartRateMonitor.getState().currentHR;
        let nextBpm = currentVal || 120;
        if (restTimeLeft !== null && restTimeLeft > 0) {
          nextBpm = Math.max(115, nextBpm - (1 + Math.random()));
        } else {
          nextBpm = nextBpm + (Math.random() * 4 - 2);
        }
        nextBpm = Math.max(70, Math.min(185, nextBpm));
        setHeartRate(nextBpm);
        setHrHistory(h => [...h, nextBpm]);`;

const target2 = `        setHeartRate((prev: number) => {
          const spike = Math.min(174, Math.max(prev + 10, 145 + Math.floor(Math.random() * 12)));
          setHrHistory(h => [...h, spike]);
          return spike;
        });`;

const newTarget2 = `        const prev = useHeartRateMonitor.getState().currentHR;
        const spike = Math.min(174, Math.max(prev + 10, 145 + Math.floor(Math.random() * 12)));
        setHeartRate(spike);
        setHrHistory(h => [...h, spike]);`;

code = code.replace(target1, newTarget1).replace(target2, newTarget2);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log("Fixed setHeartRate");

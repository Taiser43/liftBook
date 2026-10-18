const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /\{collectionType === 'Exercises' && chartData\.length > 1 \? \(/g,
  `{collectionType === 'Exercises' && chartData.length > 0 ? (`
);

c = c.replace(
  /data: \{\s*labels: chartLabels,\s*datasets: \[\{ data: chartData \}\]\s*\}/g,
  `data: {
                  labels: chartLabels.length === 1 ? [chartLabels[0], chartLabels[0]] : chartLabels,
                  datasets: [{ data: chartData.length === 1 ? [chartData[0], chartData[0]] : chartData }]
                }`
);

fs.writeFileSync(p, c);
console.log('Chart logic updated');

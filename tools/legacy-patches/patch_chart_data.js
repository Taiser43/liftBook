const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /data=\{\{\s*labels: chartLabels,\s*datasets: \[\{\s*data: chartData\s*\}\]\s*\}\}/g,
  `data={{
                  labels: chartLabels.length === 1 ? [chartLabels[0], chartLabels[0]] : chartLabels,
                  datasets: [{ data: chartData.length === 1 ? [chartData[0], chartData[0]] : chartData }]
                }}`
);

fs.writeFileSync(p, c);
console.log('Chart data replaced');

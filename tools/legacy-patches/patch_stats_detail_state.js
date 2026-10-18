const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('type DetailNode')) {
  c = c.replace(
    /const \[titleModalVisible, setTitleModalVisible\] = useState\(false\);/,
    `const [titleModalVisible, setTitleModalVisible] = useState(false);\n\n  type DetailNode = { type: 'class' | 'cardio'; name: string; iconName?: string; xp: number } | null;\n  const [detailNode, setDetailNode] = useState<DetailNode>(null);`
  );
  
  fs.writeFileSync(p, c);
  console.log('Injected detailNode state');
}

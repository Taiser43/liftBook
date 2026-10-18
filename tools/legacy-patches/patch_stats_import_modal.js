const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('LevelProgressionModal')) {
  c = c.replace(
    /import \{ EmblemIcon \} from '\.\.\/components\/EmblemIcon';/,
    "import { EmblemIcon } from '../components/EmblemIcon';\nimport { LevelProgressionModal } from '../components/LevelProgressionModal';"
  );
  
  c = c.replace(
    /return \(\n    <>\n    <ScrollView/,
    `return (
    <>
      {detailNode && (
        <LevelProgressionModal 
          visible={!!detailNode} 
          onClose={() => setDetailNode(null)} 
          title={detailNode.name} 
          currentXP={detailNode.xp} 
          type={detailNode.type} 
        />
      )}
    <ScrollView`
  );
  
  fs.writeFileSync(p, c);
  console.log('Imported LevelProgressionModal and added to render');
}

const fs = require('fs');
const p = 'src/screens/TrainingScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/style=\{styles\.centeredModalContent\}/g, 'style={styles.modalContent}');
c = c.replace(/style=\{styles\.modalButtonRow\}/g, 'style={styles.modalActions}');
c = c.replace(/style=\{styles\.modalCancelBtn\}/g, "style={[styles.modalBtn, { backgroundColor: '#333' }]}");
c = c.replace(/style=\{styles\.modalCancelBtnText\}/g, 'style={styles.modalBtnText}');
c = c.replace(/style=\{styles\.modalConfirmBtn\}/g, 'style={styles.modalBtn}');
c = c.replace(/style=\{styles\.modalConfirmBtnText\}/g, 'style={styles.modalBtnText}');
c = c.replace(/<Text style=\{styles\.modalSubtitle\}>Name your spontaneous workout<\/Text>/g, "<Text style={{ color: '#888', marginBottom: 16 }}>Name your spontaneous workout</Text>");

fs.writeFileSync(p, c);
console.log('Fixed freestyle modal styles');

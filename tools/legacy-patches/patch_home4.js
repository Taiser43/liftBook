const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const t1 = `  return (
    <ScrollView 
      style={[styles.container, { paddingTop: Math.max(insets.top + 8, 28) }]} 
      showsVerticalScrollIndicator={false}
    >`;
const r1 = `  return (
    <View style={{ flex: 1 }}>
    <ScrollView 
      style={[styles.container, { paddingTop: Math.max(insets.top + 8, 28) }]} 
      showsVerticalScrollIndicator={false}
    >`;

code = code.replace(t1, r1);

const t2 = `      )}
    </SwipeableModal>
  );
}`;
const r2 = `      )}
    </SwipeableModal>
    </View>
  );
}`;

code = code.replace(t2, r2);

fs.writeFileSync('src/screens/HomeScreen.tsx', code);

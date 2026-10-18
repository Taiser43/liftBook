const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

content = content.replace(
  "                  </Text>\n                <Text style={styles.musicArtist}",
  "                  </Text>\n                </Animated.View>\n                <Text style={styles.musicArtist}"
);

fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);

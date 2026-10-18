const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

// Insert the closing tag before </Animated.View>
content = content.replace("    </Animated.View>", "      </>\n      )}\n    </Animated.View>");

fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);

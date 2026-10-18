const fs = require('fs');

let code = fs.readFileSync('src/screens/CardioSessionDetailScreen.tsx', 'utf8');

// 1. Add stepMode state and isStepSport
code = code.replace(
  /const \[splitMode, setSplitMode\] = useState<number>\(1\);/g,
  `const [splitMode, setSplitMode] = useState<number>(1);
  const [stepMode, setStepMode] = useState<'steps' | 'km'>('steps');`
);

code = code.replace(
  /const isDistanceSport = \['Running', 'Cycling', 'Walking', 'Swimming'\]\.includes\(session\.type\);/g,
  `const isDistanceSport = ['Running', 'Cycling', 'Walking', 'Swimming'].includes(session.type);
  const isStepSport = ['Boxing', 'Football', 'Paddle'].includes(session.type);`
);

// 2. Add step sport box
code = code.replace(
  /        \{\/\* Map \/ Chart Toggle \*\/\}/g,
  `        {isStepSport && (
          <View style={styles.gridRow}>
            <TouchableOpacity style={[styles.gridBox, styles.gridBoxTranslucent]} onPress={() => setStepMode(p => p === 'steps' ? 'km' : 'steps')}>
              <Text style={styles.gridLabel}>{stepMode === 'steps' ? 'Steps' : 'Distance'}</Text>
              <Text style={[styles.gridValue, { color: '#30D158' }]}>
                {stepMode === 'steps' ? Math.round(session.distanceMeters / 0.762) : (session.distanceMeters / 1000).toFixed(2)} <Text style={{fontSize: 14}}>{stepMode === 'steps' ? '' : 'km'}</Text>
              </Text>
            </TouchableOpacity>
            <View style={[styles.gridBox, { backgroundColor: 'transparent' }]} />
          </View>
        )}
        
        {/* Map / Chart Toggle */}`
);

// 3. Add hrLineGrad to Defs and replace stroke
code = code.replace(
  /              <\/LinearGradient>\n            <\/Defs>/g,
  `              </LinearGradient>
              <LinearGradient id="hrLineGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FF3B30" />
                <Stop offset="0.25" stopColor="#FF9500" />
                <Stop offset="0.5" stopColor="#FFD700" />
                <Stop offset="0.75" stopColor="#30D158" />
                <Stop offset="1" stopColor="#00D2FF" />
              </LinearGradient>
            </Defs>`
);

code = code.replace(
  /<Path d=\{hrPath\} fill="none" stroke="#FF3B30" strokeWidth="3" \/>/g,
  `<Path d={hrPath} fill="none" stroke="url(#hrLineGrad)" strokeWidth="3" />`
);

// Also make the Area under curve a bit nicer matching the gradient
code = code.replace(
  /              <LinearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">\n                <Stop offset="0" stopColor="#FF3B30" stopOpacity="0.5" \/>\n                <Stop offset="0.5" stopColor="#FF9500" stopOpacity="0.3" \/>\n                <Stop offset="1" stopColor="#30D158" stopOpacity="0.0" \/>\n              <\/LinearGradient>/g,
  `              <LinearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FF3B30" stopOpacity="0.4" />
                <Stop offset="0.25" stopColor="#FF9500" stopOpacity="0.3" />
                <Stop offset="0.5" stopColor="#FFD700" stopOpacity="0.2" />
                <Stop offset="0.75" stopColor="#30D158" stopOpacity="0.1" />
                <Stop offset="1" stopColor="#00D2FF" stopOpacity="0.0" />
              </LinearGradient>`
);

fs.writeFileSync('src/screens/CardioSessionDetailScreen.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/components/MusicSettingsModal.tsx', 'utf8');

// Fix import
code = code.replace("Switch, Slider as RNSlider } from 'react-native';", "Switch } from 'react-native';");

// Remove EQ section
const eqSection = `<View style={styles.section}>
            <Text style={styles.label}>Equalizer (Virtual)</Text>
            <View style={styles.eqContainer}>
              {['60Hz', '230Hz', '910Hz', '3kHz', '14kHz'].map((band, idx) => (
                <View key={idx} style={styles.eqSliderContainer}>
                  <Text style={styles.eqValue}>{eqSettings[idx] > 0 ? '+' : ''}{eqSettings[idx]}</Text>
                  <View style={{ height: 120, justifyContent: 'center' }}>
                    <Slider
                      style={{ width: 120, transform: [{ rotate: '-90deg' }] }}
                      minimumValue={-10}
                      maximumValue={10}
                      step={1}
                      value={eqSettings[idx]}
                      onValueChange={(val) => handleEqChange(idx, val)}
                      minimumTrackTintColor="#FFD60A"
                      maximumTrackTintColor="#333"
                      thumbTintColor="#FFF"
                    />
                  </View>
                  <Text style={styles.eqBand}>{band}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.hint}>Note: Native audio EQ requires custom native module compilation.</Text>
          </View>`;

code = code.replace(eqSection, "");

fs.writeFileSync('src/components/MusicSettingsModal.tsx', code);
console.log("Patched MusicSettingsModal.tsx");

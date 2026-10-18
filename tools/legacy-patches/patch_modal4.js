const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

const target = `            }
          />
        </View>
      </Modal>

      {/* END OF WORKOUT CELEBRATION MODAL */}`;

const replacement = `            }
          />
        </View>
        </GestureHandlerRootView>
      </Modal>

      {/* END OF WORKOUT CELEBRATION MODAL */}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/screens/TrainingScreen.tsx', code);

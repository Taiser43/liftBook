const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

const target = `          </DraggableFlatList>
        </View>
      </Modal>`;

const replacement = `          </DraggableFlatList>
        </View>
        </GestureHandlerRootView>
      </Modal>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/screens/TrainingScreen.tsx', code);

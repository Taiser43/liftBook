const fs = require('fs');
const p = 'src/screens/TrainingScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /<\/Text>\n\s*<\/TouchableOpacity>\n\n\s*\{\/\* Swap Exercise Modal \*\/\}/,
  `</Text>
            </TouchableOpacity>
        </View>
      </Modal>

            {/* Swap Exercise Modal */}`
);

fs.writeFileSync(p, c);
console.log('Fixed missing closing tags');

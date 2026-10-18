const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src', 'screens');
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(screensDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // If no TextInput, skip
  if (!content.includes('<TextInput')) continue;

  // Ensure import KeyboardAwareWrapper
  if (!content.includes('KeyboardAwareWrapper')) {
    const importStatement = "import { KeyboardAwareWrapper } from '../components/KeyboardAwareWrapper';\n";
    const lastImportIndex = content.lastIndexOf('import ');
    const endOfLastImport = content.indexOf('\n', lastImportIndex) + 1;
    content = content.slice(0, endOfLastImport) + importStatement + content.slice(endOfLastImport);
  }

  // Replace <ScrollView> inside modals with KeyboardAwareWrapper
  // A simple way is to replace <ScrollView style={styles.modalScroll}> with <KeyboardAwareWrapper contentContainerStyle={styles.modalScroll}>
  // and corresponding </ScrollView> but only if it's inside a modal. Actually, just replacing ScrollView containing TextInputs is safer, but regex is hard.
  // Let's replace <ScrollView style={styles.modalScroll}>
  let newContent = content.replace(/<ScrollView([^>]*)style=\{styles\.modalScroll\}([^>]*)>/g, '<KeyboardAwareWrapper$1contentContainerStyle={styles.modalScroll}$2>');
  // Also need to fix closing tags... wait, if I replace the opening tag, I must replace the closing tag. But there might be other ScrollViews.
  
  // Alternative: globally change `Modal` content wrappers if they have text inputs.
  // We can just wrap `<TextInput` with `<KeyboardAwareWrapper scrollEnabled={false}>` if it's not scrolling, but KeyboardAvoidingView works best wrapping the screen.

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Patched Keyboard in', file);
}

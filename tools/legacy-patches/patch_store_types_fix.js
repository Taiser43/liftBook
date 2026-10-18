const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

const interfaceStr = `
export interface CustomAlertButton {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
}

export interface CustomAlertOptions {
  title: string;
  message?: string;
  buttons?: CustomAlertButton[];
}
`;

code = code.replace(`interface AppState {`, `${interfaceStr}\ninterface AppState {`);
fs.writeFileSync('src/store/store.ts', code);
console.log('Done');

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

code = code.replace(`export interface AppState {`, `${interfaceStr}\nexport interface AppState {`);

code = code.replace(
  `  finishCurrentStrength: ((skipNav?: boolean) => void) | null;
  setFinishCurrentStrength: (fn: ((skipNav?: boolean) => void) | null) => void;`,
  `  finishCurrentStrength: ((skipNav?: boolean) => void) | null;
  setFinishCurrentStrength: (fn: ((skipNav?: boolean) => void) | null) => void;
  customAlertOptions: CustomAlertOptions | null;
  setCustomAlert: (options: CustomAlertOptions | null) => void;`
);

code = code.replace(
  `      finishCurrentStrength: null,
      setFinishCurrentStrength: (fn) => set({ finishCurrentStrength: fn }),`,
  `      finishCurrentStrength: null,
      setFinishCurrentStrength: (fn) => set({ finishCurrentStrength: fn }),
      customAlertOptions: null,
      setCustomAlert: (options) => set({ customAlertOptions: options }),`
);

// add showCustomAlert export helper
code += `\nexport function showCustomAlert(title: string, message?: string, buttons?: CustomAlertButton[]) {
  useAppStore.getState().setCustomAlert({ title, message, buttons });
}\n`;

fs.writeFileSync('src/store/store.ts', code);
console.log('Done');

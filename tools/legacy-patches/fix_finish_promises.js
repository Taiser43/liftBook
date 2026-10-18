const fs = require('fs');

let storeCode = fs.readFileSync('src/store/store.ts', 'utf8');
storeCode = storeCode.replace(/finishCurrentCardio: \(\(skipNav\?: boolean\) => void\) \| null;/g, 'finishCurrentCardio: ((skipNav?: boolean) => Promise<void>) | null;');
storeCode = storeCode.replace(/setFinishCurrentCardio: \(fn: \(\(skipNav\?: boolean\) => void\) \| null\) => void;/g, 'setFinishCurrentCardio: (fn: ((skipNav?: boolean) => Promise<void>) | null) => void;');
storeCode = storeCode.replace(/finishCurrentStrength: \(\(skipNav\?: boolean\) => void\) \| null;/g, 'finishCurrentStrength: ((skipNav?: boolean) => Promise<void>) | null;');
storeCode = storeCode.replace(/setFinishCurrentStrength: \(fn: \(\(skipNav\?: boolean\) => void\) \| null\) => void;/g, 'setFinishCurrentStrength: (fn: ((skipNav?: boolean) => Promise<void>) | null) => void;');
fs.writeFileSync('src/store/store.ts', storeCode);

let trainingCode = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');
trainingCode = trainingCode.replace(/const handleFinishLiveWorkout = \(skipCelebration = false\) => {/g, 'const handleFinishLiveWorkout = async (skipCelebration = false) => {');
trainingCode = trainingCode.replace(/onPress: \(\) => {\n\s*if \(useAppStore\.getState\(\)\.finishCurrentCardio\) {/g, 'onPress: async () => {\n                if (useAppStore.getState().finishCurrentCardio) {');
trainingCode = trainingCode.replace(/useAppStore\.getState\(\)\.finishCurrentCardio!\(true\);/g, 'await useAppStore.getState().finishCurrentCardio!(true);');
trainingCode = trainingCode.replace(/setTimeout\(\(\) => startFreshStrengthWorkout\(plan\), 300\);/g, 'startFreshStrengthWorkout(plan);');
trainingCode = trainingCode.replace(/onPress: \(\) => {\n\s*handleFinishLiveWorkout\(true\);\n\s*setTimeout\(\(\) => startFreshStrengthWorkout\(plan\), 300\);/g, 'onPress: async () => {\n                await handleFinishLiveWorkout(true);\n                startFreshStrengthWorkout(plan);');
fs.writeFileSync('src/screens/TrainingScreen.tsx', trainingCode);

let cardioHomeCode = fs.readFileSync('src/screens/CardioHomeScreen.tsx', 'utf8');
cardioHomeCode = cardioHomeCode.replace(/onPress: \(\) => {\n\s*if \(store\.finishCurrentCardio\) store\.finishCurrentCardio\(true\);\n\s*setTimeout\(\(\) => {/g, 'onPress: async () => {\n                if (store.finishCurrentCardio) await store.finishCurrentCardio(true);\n                ');
cardioHomeCode = cardioHomeCode.replace(/onPress: \(\) => {\n\s*if \(store\.finishCurrentStrength\) store\.finishCurrentStrength\(true\);\n\s*setTimeout\(\(\) => {/g, 'onPress: async () => {\n                if (store.finishCurrentStrength) await store.finishCurrentStrength(true);\n                ');
cardioHomeCode = cardioHomeCode.replace(/}, 300\);\n\s*}/g, '}\n            }');
fs.writeFileSync('src/screens/CardioHomeScreen.tsx', cardioHomeCode);

let cardioTestsCode = fs.readFileSync('src/screens/CardioTestsScreen.tsx', 'utf8');
cardioTestsCode = cardioTestsCode.replace(/onPress: \(\) => {\n\s*if \(store\.finishCurrentCardio\) store\.finishCurrentCardio\(true\);\n\s*setTimeout\(\(\) => {/g, 'onPress: async () => {\n              if (store.finishCurrentCardio) await store.finishCurrentCardio(true);\n              ');
cardioTestsCode = cardioTestsCode.replace(/onPress: \(\) => {\n\s*if \(store\.finishCurrentStrength\) store\.finishCurrentStrength\(true\);\n\s*setTimeout\(\(\) => {/g, 'onPress: async () => {\n              if (store.finishCurrentStrength) await store.finishCurrentStrength(true);\n              ');
cardioTestsCode = cardioTestsCode.replace(/}, 300\);\n\s*}/g, '}\n          }');
fs.writeFileSync('src/screens/CardioTestsScreen.tsx', cardioTestsCode);

console.log('Done');

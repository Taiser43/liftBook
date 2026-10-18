import re

with open('src/screens/TrainingScreen.tsx', 'r') as f:
    code = f.read()

if "import { useLiveWorkoutStore }" not in code:
    code = code.replace("import TrackPlayer from 'react-native-track-player';", "import TrackPlayer from 'react-native-track-player';\nimport { useLiveWorkoutStore } from '../store/useLiveWorkoutStore';")

with open('src/screens/TrainingScreen.tsx', 'w') as f:
    f.write(code)

export interface PreloadedExercise {
  name: string;
  category: 'Chest' | 'Back' | 'Shoulders' | 'Legs' | 'Arms' | 'Core';
  targetMuscle: string;
  equipmentType?: string;
  brand?: string;
}

export const TARGET_MUSCLES_BY_CATEGORY: Record<string, string[]> = {
  Chest: ['Mittlere Brust', 'Obere Brust', 'Untere Brust'],
  Back: ['Latissimus', 'Oberer Rücken / Trapez', 'Unterer Rücken'],
  Shoulders: ['Seitliche Schulter', 'Vordere Schulter', 'Hintere Schulter'],
  Arms: ['Bizeps', 'Trizeps', 'Unterarme'],
  Legs: ['Quadrizeps', 'Beinbeuger / Hamstrings', 'Glutes / Gesäß', 'Waden', 'Adduktoren / Abduktoren'],
  Core: ['Gerade Bauchmuskeln', 'Seitliche Bauchmuskeln', 'Tiefer Core'],
};

export const MAJOR_MUSCLE_LABELS_DE: Record<string, string> = {
  All: 'Alle',
  Chest: 'Brust',
  Back: 'Rücken',
  Shoulders: 'Schultern',
  Arms: 'Arme',
  Legs: 'Beine',
  Core: 'Core / Rumpf',
};

export const PRELOADED_EXERCISES: PreloadedExercise[] = [
  // CHEST
  { name: 'Barbell Bench Press', category: 'Chest', targetMuscle: 'Mittlere Brust', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Incline Barbell Bench Press', category: 'Chest', targetMuscle: 'Obere Brust', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Decline Barbell Bench Press', category: 'Chest', targetMuscle: 'Untere Brust', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Flat Dumbbell Press', category: 'Chest', targetMuscle: 'Mittlere Brust', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Incline Dumbbell Press', category: 'Chest', targetMuscle: 'Obere Brust', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Decline Dumbbell Press', category: 'Chest', targetMuscle: 'Untere Brust', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Dumbbell Chest Fly', category: 'Chest', targetMuscle: 'Mittlere Brust', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Incline Dumbbell Fly', category: 'Chest', targetMuscle: 'Obere Brust', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Cable Crossover (High to Low)', category: 'Chest', targetMuscle: 'Untere Brust', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Cable Crossover (Low to High)', category: 'Chest', targetMuscle: 'Obere Brust', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Middle Cable Chest Fly', category: 'Chest', targetMuscle: 'Mittlere Brust', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Chest Press Machine', category: 'Chest', targetMuscle: 'Mittlere Brust', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Incline Chest Press Machine', category: 'Chest', targetMuscle: 'Obere Brust', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Pec Deck / Fly Machine', category: 'Chest', targetMuscle: 'Mittlere Brust', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Dips (Chest Focus)', category: 'Chest', targetMuscle: 'Untere Brust', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Push-Ups (Standard)', category: 'Chest', targetMuscle: 'Mittlere Brust', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Weighted Push-Ups', category: 'Chest', targetMuscle: 'Mittlere Brust', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Decline Push-Ups', category: 'Chest', targetMuscle: 'Obere Brust', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Landmine Chest Press', category: 'Chest', targetMuscle: 'Obere Brust', equipmentType: 'Maschine', brand: 'Keine' },

  // BACK
  { name: 'Deadlift (Conventional)', category: 'Back', targetMuscle: 'Unterer Rücken', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Deadlift (Sumo)', category: 'Back', targetMuscle: 'Glutes / Gesäß', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Barbell Bent-Over Row', category: 'Back', targetMuscle: 'Oberer Rücken / Trapez', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Pendlay Row', category: 'Back', targetMuscle: 'Oberer Rücken / Trapez', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'Lat Pulldown (Wide Grip)', category: 'Back', targetMuscle: 'Latissimus', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Lat Pulldown (Close Grip / V-Bar)', category: 'Back', targetMuscle: 'Latissimus', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Pull-Up / Chin-Up', category: 'Back', targetMuscle: 'Latissimus', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Neutral Grip Pull-Up', category: 'Back', targetMuscle: 'Latissimus', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Seated Cable Row', category: 'Back', targetMuscle: 'Oberer Rücken / Trapez', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Single-Arm Dumbbell Row', category: 'Back', targetMuscle: 'Latissimus', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Meadow Row (Landmine)', category: 'Back', targetMuscle: 'Oberer Rücken / Trapez', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'T-Bar Row (Chest Supported)', category: 'Back', targetMuscle: 'Oberer Rücken / Trapez', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'Chest Supported Dumbbell Row', category: 'Back', targetMuscle: 'Oberer Rücken / Trapez', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Face Pull (Cable Rope)', category: 'Back', targetMuscle: 'Oberer Rücken / Trapez', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Straight-Arm Cable Pulldown', category: 'Back', targetMuscle: 'Latissimus', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Lat Prayer (Cable)', category: 'Back', targetMuscle: 'Latissimus', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Hyperextensions (Back Extensions)', category: 'Back', targetMuscle: 'Unterer Rücken', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'Good Mornings (Barbell)', category: 'Back', targetMuscle: 'Unterer Rücken', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Barbell / Dumbbell Shrugs', category: 'Back', targetMuscle: 'Oberer Rücken / Trapez', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Rack Pulls', category: 'Back', targetMuscle: 'Oberer Rücken / Trapez', equipmentType: 'Sonstiges', brand: 'Keine' },

  // SHOULDERS
  { name: 'Overhead Barbell Press (OHP)', category: 'Shoulders', targetMuscle: 'Vordere Schulter', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Seated Dumbbell Shoulder Press', category: 'Shoulders', targetMuscle: 'Vordere Schulter', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Standing Dumbbell Shoulder Press', category: 'Shoulders', targetMuscle: 'Vordere Schulter', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Arnold Press', category: 'Shoulders', targetMuscle: 'Vordere Schulter', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Lateral Raises (Dumbbell)', category: 'Shoulders', targetMuscle: 'Seitliche Schulter', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Cable Lateral Raises (Single Arm)', category: 'Shoulders', targetMuscle: 'Seitliche Schulter', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Machine Lateral Raise', category: 'Shoulders', targetMuscle: 'Seitliche Schulter', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Incline Dumbbell Lateral Raise', category: 'Shoulders', targetMuscle: 'Seitliche Schulter', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Front Dumbbell Raise', category: 'Shoulders', targetMuscle: 'Vordere Schulter', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Cable Front Raise', category: 'Shoulders', targetMuscle: 'Vordere Schulter', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Rear Delt Reverse Fly (Dumbbell)', category: 'Shoulders', targetMuscle: 'Hintere Schulter', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Rear Delt Machine (Reverse Pec Deck)', category: 'Shoulders', targetMuscle: 'Hintere Schulter', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Cable Rear Delt Fly (Cross)', category: 'Shoulders', targetMuscle: 'Hintere Schulter', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Upright Row (Barbell / Cable)', category: 'Shoulders', targetMuscle: 'Seitliche Schulter', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Smith Machine Overhead Press', category: 'Shoulders', targetMuscle: 'Vordere Schulter', equipmentType: 'Multipresse', brand: 'Keine' },
  { name: 'Lu Raises', category: 'Shoulders', targetMuscle: 'Seitliche Schulter', equipmentType: 'Sonstiges', brand: 'Keine' },

  // LEGS
  { name: 'Barbell Back Squat', category: 'Legs', targetMuscle: 'Quadrizeps', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Front Squat (Barbell)', category: 'Legs', targetMuscle: 'Quadrizeps', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Goblet Squat (Dumbbell)', category: 'Legs', targetMuscle: 'Quadrizeps', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Hack Squat (Machine)', category: 'Legs', targetMuscle: 'Quadrizeps', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Leg Press (45° Machine)', category: 'Legs', targetMuscle: 'Quadrizeps', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Romanian Deadlift (RDL - Barbell)', category: 'Legs', targetMuscle: 'Beinbeuger / Hamstrings', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Dumbbell Romanian Deadlift (DB RDL)', category: 'Legs', targetMuscle: 'Beinbeuger / Hamstrings', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Bulgarian Split Squat', category: 'Legs', targetMuscle: 'Quadrizeps', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Walking Dumbbell Lunges', category: 'Legs', targetMuscle: 'Quadrizeps', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Reverse Lunges (Barbell / DB)', category: 'Legs', targetMuscle: 'Glutes / Gesäß', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Leg Extension (Machine)', category: 'Legs', targetMuscle: 'Quadrizeps', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Lying Hamstring Curl', category: 'Legs', targetMuscle: 'Beinbeuger / Hamstrings', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Seated Hamstring Curl', category: 'Legs', targetMuscle: 'Beinbeuger / Hamstrings', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Standing Calf Raises (Machine / DB)', category: 'Legs', targetMuscle: 'Waden', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Seated Calf Raises', category: 'Legs', targetMuscle: 'Waden', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'Hip Thrust (Barbell / Machine)', category: 'Legs', targetMuscle: 'Glutes / Gesäß', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Glute Bridge (Barbell / DB)', category: 'Legs', targetMuscle: 'Glutes / Gesäß', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Hip Abduction Machine', category: 'Legs', targetMuscle: 'Glutes / Gesäß', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Hip Adduction Machine', category: 'Legs', targetMuscle: 'Adduktoren / Abduktoren', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Cable Glute Kickbacks', category: 'Legs', targetMuscle: 'Glutes / Gesäß', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Sissy Squat', category: 'Legs', targetMuscle: 'Quadrizeps', equipmentType: 'Freie Übung', brand: 'Keine' },

  // ARMS
  { name: 'Barbell Bicep Curl', category: 'Arms', targetMuscle: 'Bizeps', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'EZ-Bar Bicep Curl', category: 'Arms', targetMuscle: 'Bizeps', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Dumbbell Hammer Curl', category: 'Arms', targetMuscle: 'Bizeps', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Incline Dumbbell Curl', category: 'Arms', targetMuscle: 'Bizeps', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Preacher Curl (EZ Bar / Machine)', category: 'Arms', targetMuscle: 'Bizeps', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Concentration Curl (Dumbbell)', category: 'Arms', targetMuscle: 'Bizeps', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Cable Bicep Curl (Straight / Rope)', category: 'Arms', targetMuscle: 'Bizeps', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Spider Curl (Dumbbell / EZ-Bar)', category: 'Arms', targetMuscle: 'Bizeps', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Reverse Barbell Curl (Forearms)', category: 'Arms', targetMuscle: 'Unterarme', equipmentType: 'Freie Übung', brand: 'Keine' },
  { name: 'Tricep Rope Pushdown', category: 'Arms', targetMuscle: 'Trizeps', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Straight Bar Tricep Pushdown', category: 'Arms', targetMuscle: 'Trizeps', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Skull Crushers (EZ Bar)', category: 'Arms', targetMuscle: 'Trizeps', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'Overhead Tricep Extension (Dumbbell / Cable)', category: 'Arms', targetMuscle: 'Trizeps', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Single-Arm Cable Tricep Extension', category: 'Arms', targetMuscle: 'Trizeps', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Close-Grip Bench Press', category: 'Arms', targetMuscle: 'Trizeps', equipmentType: 'Maschine', brand: 'Keine' },
  { name: 'Dips (Tricep Focus / Parallel Bars)', category: 'Arms', targetMuscle: 'Trizeps', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Bench Dips (Weighted / Bodyweight)', category: 'Arms', targetMuscle: 'Trizeps', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Tricep Kickbacks (Dumbbell / Cable)', category: 'Arms', targetMuscle: 'Trizeps', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Wrist Curls (Forearms)', category: 'Arms', targetMuscle: 'Unterarme', equipmentType: 'Freie Übung', brand: 'Keine' },

  // CORE
  { name: 'Hanging Leg Raises', category: 'Core', targetMuscle: 'Gerade Bauchmuskeln', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'Captain’s Chair Leg / Knee Raises', category: 'Core', targetMuscle: 'Gerade Bauchmuskeln', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'Cable Kneeling Crunch', category: 'Core', targetMuscle: 'Gerade Bauchmuskeln', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Cable Woodchoppers', category: 'Core', targetMuscle: 'Seitliche Bauchmuskeln', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Ab Wheel Rollout', category: 'Core', targetMuscle: 'Gerade Bauchmuskeln', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'Plank (Standard / Weighted)', category: 'Core', targetMuscle: 'Tiefer Core', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Side Plank (Hip Dips)', category: 'Core', targetMuscle: 'Seitliche Bauchmuskeln', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Russian Twists (Weighted)', category: 'Core', targetMuscle: 'Seitliche Bauchmuskeln', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'Decline Bench Weighted Crunches', category: 'Core', targetMuscle: 'Gerade Bauchmuskeln', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Bicycle Crunches', category: 'Core', targetMuscle: 'Seitliche Bauchmuskeln', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'V-Ups / Pike Crunches', category: 'Core', targetMuscle: 'Gerade Bauchmuskeln', equipmentType: 'Bodyweight', brand: 'Keine' },
  { name: 'Dead Bug', category: 'Core', targetMuscle: 'Tiefer Core', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'Hollow Body Hold', category: 'Core', targetMuscle: 'Tiefer Core', equipmentType: 'Sonstiges', brand: 'Keine' },
  { name: 'Pallof Press (Cable Anti-Rotation)', category: 'Core', targetMuscle: 'Seitliche Bauchmuskeln', equipmentType: 'Kabelturm', brand: 'Keine' },
  { name: 'Dragon Flags', category: 'Core', targetMuscle: 'Gerade Bauchmuskeln', equipmentType: 'Sonstiges', brand: 'Keine' },
];

export const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export const RADAR_GROUPS: Array<{ name: 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core'; label: string }> = [
  { name: 'Chest', label: 'Chest' },
  { name: 'Back', label: 'Back' },
  { name: 'Shoulders', label: 'Shoulders' },
  { name: 'Arms', label: 'Arms' },
  { name: 'Legs', label: 'Legs' },
  { name: 'Core', label: 'Core' },
];

export type MuscleCategory = 'Chest' | 'Back' | 'Shoulders' | 'Legs' | 'Arms' | 'Core';

/**
 * Normalizes any category string (German or English, case-insensitive) into standard MuscleCategory union.
 */
export const normalizeMuscleCategory = (cat?: string): MuscleCategory | null => {
  if (!cat) return null;
  const c = cat.toLowerCase().trim();
  if (c === 'chest' || c === 'brust') return 'Chest';
  if (c === 'back' || c === 'rücken' || c === 'ruecken') return 'Back';
  if (c === 'shoulders' || c === 'schultern' || c === 'schulter') return 'Shoulders';
  if (c === 'legs' || c === 'beine' || c === 'bein') return 'Legs';
  if (c === 'arms' || c === 'arme' || c === 'arm') return 'Arms';
  if (c === 'core' || c === 'bauch' || c === 'rumpf') return 'Core';
  return null;
};

/**
 * Intelligent multi-language heuristic classifier for German and English exercise names.
 * Crucial rule: body-part specific names (Schulter, Brust, Rücken, Arme, Beine, Bauch)
 * are checked BEFORE generic words (like 'press' or 'drücken') to ensure 'Schulterpresse'
 * is ALWAYS classified as 'Shoulders' and never as 'Legs' or 'Core'.
 */
export const inferMuscleCategoryFromName = (exerciseName: string): MuscleCategory => {
  if (!exerciseName) return 'Core';
  const name = exerciseName.toLowerCase().trim();

  // 1. Shoulders / Schulter (CHECK FIRST to accurately match Schulterpresse, Schulterdrücken, etc.)
  if (
    name.includes('schulter') ||
    name.includes('shoulder') ||
    name.includes('overhead') ||
    name.includes('ohp') ||
    name.includes('seitheb') ||
    name.includes('frontheb') ||
    name.includes('lateral raise') ||
    name.includes('delt') ||
    name.includes('shrug') ||
    name.includes('arnold') ||
    name.includes('nackendrück') ||
    name.includes('military') ||
    name.includes('upright row') ||
    name.includes('face pull') ||
    name.includes('lu raise')
  ) {
    return 'Shoulders';
  }

  // 2. Chest / Brust (CHECK BEFORE generic 'press' to catch Brustpresse, Bankdrücken, etc.)
  if (
    name.includes('brust') ||
    name.includes('chest') ||
    name.includes('bench') ||
    name.includes('bankdrück') ||
    name.includes('pec') ||
    name.includes('push-up') ||
    name.includes('pushup') ||
    name.includes('liegestütz') ||
    name.includes('fly') ||
    name.includes('fliegend') ||
    name.includes('butterfl') ||
    name.includes('dips (chest') ||
    name.includes('landmine')
  ) {
    return 'Chest';
  }

  // 3. Back / Rücken
  if (
    name.includes('rücken') ||
    name.includes('ruecken') ||
    name.includes('back') ||
    name.includes('row') ||
    name.includes('ruder') ||
    name.includes('lat') ||
    name.includes('pull-up') ||
    name.includes('pullup') ||
    name.includes('klimmzug') ||
    name.includes('klimmzüg') ||
    name.includes('chin-up') ||
    name.includes('pulldown') ||
    name.includes('latzug') ||
    name.includes('deadlift') ||
    name.includes('kreuzheb') ||
    name.includes('pendlay') ||
    name.includes('hyperextension')
  ) {
    return 'Back';
  }

  // 4. Arms / Arme
  if (
    name.includes('bizep') ||
    name.includes('bicep') ||
    name.includes('trizep') ||
    name.includes('tricep') ||
    name.includes('curl') ||
    name.includes('unterarm') ||
    name.includes('forearm') ||
    name.includes('wrist') ||
    name.includes('skull') ||
    name.includes('french press') ||
    name.includes('kickback') ||
    name.includes('pushdown') ||
    name.includes('trizepsdrück') ||
    name.includes('hammer') ||
    name.includes('dips (tricep') ||
    name.includes('dips (parallel') ||
    name.includes('arm blaster')
  ) {
    return 'Arms';
  }

  // 5. Legs / Beine
  if (
    name.includes('bein') ||
    name.includes('leg') ||
    name.includes('squat') ||
    name.includes('kniebeug') ||
    name.includes('lunge') ||
    name.includes('ausfallschritt') ||
    name.includes('calf') ||
    name.includes('wade') ||
    name.includes('hamstring') ||
    name.includes('quad') ||
    name.includes('beinpress') ||
    name.includes('leg press') ||
    name.includes('rdl') ||
    name.includes('addukt') ||
    name.includes('abdukt') ||
    name.includes('glute') ||
    name.includes('gesäß') ||
    name.includes('hip thrust') ||
    name.includes('beinstreck') ||
    name.includes('beinbeug') ||
    name.includes('wadenheb') ||
    name.includes('hackenschmidt') ||
    name.includes('hack squat')
  ) {
    return 'Legs';
  }

  // 6. Core / Bauch
  if (
    name.includes('core') ||
    name.includes('bauch') ||
    name.includes('abs') ||
    name.includes('crunch') ||
    name.includes('plank') ||
    name.includes('sit-up') ||
    name.includes('situp') ||
    name.includes('leg raise') ||
    name.includes('beinheb') ||
    name.includes('woodchopper') ||
    name.includes('rollout') ||
    name.includes('twist') ||
    name.includes('dragon flag') ||
    name.includes('dead bug') ||
    name.includes('pallof') ||
    name.includes('hollow body')
  ) {
    return 'Core';
  }

  // Generic press / dip fallbacks
  if (name.includes('dip')) return 'Chest';
  if (name.includes('press')) return 'Chest';

  return 'Core';
};

export const resolveExerciseMuscleInfo = (
  exerciseName: string,
  customExercises?: any[]
): { majorGroup: MuscleCategory; targetMuscle: string } => {
  if (!exerciseName) return { majorGroup: 'Arms', targetMuscle: 'Standard' };
  const norm = exerciseName.toLowerCase().trim();

  // 1. Check customExercises from library first!
  if (customExercises && customExercises.length > 0) {
    const custom = customExercises.find((c: any) => c.name?.toLowerCase().trim() === norm);
    if (custom) {
      const normalizedCat = normalizeMuscleCategory(custom.category);
      if (normalizedCat) {
        return {
          majorGroup: normalizedCat,
          targetMuscle: custom.targetMuscle || 'Standard',
        };
      }
      const targetCat = normalizeMuscleCategory(custom.targetMuscle);
      if (targetCat) {
        return {
          majorGroup: targetCat,
          targetMuscle: custom.targetMuscle,
        };
      }
    }
  }

  // 2. Check PRELOADED_EXERCISES
  const pre = PRELOADED_EXERCISES.find(p => p.name.toLowerCase().trim() === norm);
  if (pre) {
    return {
      majorGroup: pre.category,
      targetMuscle: pre.targetMuscle,
    };
  }

  // 3. Fallback: intelligent multi-language classifier
  const inferred = inferMuscleCategoryFromName(exerciseName);
  return { majorGroup: inferred, targetMuscle: 'Standard' };
};

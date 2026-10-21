/**
 * AI Nutrition Coach Service
 * 
 * Bietet hochpräzise, fitness-orientierte Mahlzeiten- und Shake-Vorschläge
 * basierend auf dem exakt offenen Tagesbudget (Kalorien, Protein, Carbs, Fett).
 * 
 * Kombiniert:
 * 1. Google Gemini API (Structured JSON Mode) für kreative, frische Ideen
 * 2. Mathematischen Nährwert-Guardrail (Plausibilitätsprüfung P*4 + C*4 + F*9 ~ Kcal)
 * 3. Robuste lokale Smart-Scaling-Engine mit 8 Gym-Klassikern (100% Offline-Garantie)
 */

export interface CoachIngredient {
  name: string;
  amount: string; // z.B. "220g" oder "1 Scoop (30g)"
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CoachRecipeSuggestion {
  id: string;
  title: string;
  category: 'shake' | 'bowl' | 'savory' | 'snack';
  categoryLabel: string;
  icon: string;
  prepTimeMinutes: number;
  difficulty: 'Blitzschnell' | 'Sehr einfach';
  reasonWhy: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: CoachIngredient[];
  instructions: string[];
  proTip: string;
  source: 'ai' | 'smart_scaler';
}

export interface MacroCoachRequest {
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
  category?: 'all' | 'shake' | 'bowl' | 'savory' | 'snack';
  apiKey?: string;
}

// 8 kuratierte, alltagstaugliche Fitness-Archetypen mit realistischen Vorrats-Zutaten
interface FallbackTemplate {
  id: string;
  title: string;
  category: 'shake' | 'bowl' | 'savory' | 'snack';
  categoryLabel: string;
  icon: string;
  prepTimeMinutes: number;
  difficulty: 'Blitzschnell' | 'Sehr einfach';
  reasonWhy: string;
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  ingredients: Array<{
    name: string;
    baseAmount: number;
    unit: string;
    proteinPer100: number;
    carbsPer100: number;
    fatPer100: number;
    caloriesPer100: number;
  }>;
  instructions: string[];
  proTip: string;
}

const FALLBACK_FITNESS_TEMPLATES: FallbackTemplate[] = [
  {
    id: 'turbo_whey_fluff',
    title: 'Turbo Whey-Casein Fluff',
    category: 'bowl',
    categoryLabel: 'Fluff / Bowl',
    icon: 'spoon-sugar',
    prepTimeMinutes: 3,
    difficulty: 'Blitzschnell',
    reasonWhy: 'Extremes Volumen, sättigt brutal & liefert viel Protein mit fast null Fett.',
    baseCalories: 360,
    baseProtein: 44,
    baseCarbs: 32,
    baseFat: 4,
    ingredients: [
      { name: 'Magerquark oder Skyr', baseAmount: 220, unit: 'g', proteinPer100: 12, carbsPer100: 4, fatPer100: 0.2, caloriesPer100: 67 },
      { name: 'Vanille Whey oder Casein', baseAmount: 30, unit: 'g', proteinPer100: 80, carbsPer100: 4, fatPer100: 2.5, caloriesPer100: 380 },
      { name: 'Gefrorene Beeren', baseAmount: 100, unit: 'g', proteinPer100: 1, carbsPer100: 10, fatPer100: 0.5, caloriesPer100: 48 },
      { name: 'Ungesüßte Mandelmilch', baseAmount: 60, unit: 'ml', proteinPer100: 0.5, carbsPer100: 0.3, fatPer100: 1.1, caloriesPer100: 13 },
    ],
    instructions: [
      'Quark, Whey und einen Schluck kalte Mandelmilch in eine Rührschüssel geben.',
      'Mit Handrührgerät oder Schneebesen 90 Sek. auf höchster Stufe cremig aufschlagen (wird ultra luftig!).',
      'Gefrorene Beeren und nach Wunsch Flavdrops oder Zimt unterheben.'
    ],
    proTip: 'Casein bindet Flüssigkeit noch stärker als Whey und ergibt fast Softeis-Konsistenz!'
  },
  {
    id: 'oat_whey_power_shake',
    title: 'Power Oat-Whey Shake',
    category: 'shake',
    categoryLabel: 'Shake',
    icon: 'bottle-tonic-plus-outline',
    prepTimeMinutes: 2,
    difficulty: 'Blitzschnell',
    reasonWhy: 'Schnelle Verdaulichkeit, füllt Carbs & Proteine ohne Völlegefühl.',
    baseCalories: 430,
    baseProtein: 38,
    baseCarbs: 52,
    baseFat: 6,
    ingredients: [
      { name: 'Fettarme Milch (1.5%)', baseAmount: 300, unit: 'ml', proteinPer100: 3.4, carbsPer100: 4.8, fatPer100: 1.5, caloriesPer100: 47 },
      { name: 'Schoko-Whey Isolat', baseAmount: 35, unit: 'g', proteinPer100: 82, carbsPer100: 3, fatPer100: 1.5, caloriesPer100: 375 },
      { name: 'Zarte Haferflocken (Instant Oats)', baseAmount: 45, unit: 'g', proteinPer100: 13.5, carbsPer100: 59, fatPer100: 7, caloriesPer100: 370 },
      { name: 'Frische Banane', baseAmount: 60, unit: 'g', proteinPer100: 1.2, carbsPer100: 22, fatPer100: 0.2, caloriesPer100: 95 },
    ],
    instructions: [
      'Zuerst die Milch in den Shaker/Mixer füllen (verhindert Klumpen am Becherboden).',
      'Whey, Instant Oats und die Banane hinzugeben.',
      '30 Sekunden auf höchster Stufe durchmixen und sofort eiskalt trinken.'
    ],
    proTip: '2-3 Eiswürfel mitmixen für die dickcremige Shake-Bar Textur.'
  },
  {
    id: 'egg_white_feta_pan',
    title: 'High-Protein Eiklar-Pfanne mit Light-Feta',
    category: 'savory',
    categoryLabel: 'Herzhaft',
    icon: 'egg-fried',
    prepTimeMinutes: 6,
    difficulty: 'Sehr einfach',
    reasonWhy: 'Wärmende herzhafte Mahlzeit mit höchster biologischer Wertigkeit.',
    baseCalories: 385,
    baseProtein: 42,
    baseCarbs: 22,
    baseFat: 12,
    ingredients: [
      { name: 'Flüssiges Eiklar (oder 1 Ei + 3 Eiklar)', baseAmount: 200, unit: 'ml', proteinPer100: 11, carbsPer100: 0.7, fatPer100: 0.2, caloriesPer100: 50 },
      { name: 'Vollei (Größe M)', baseAmount: 55, unit: 'g', proteinPer100: 12.5, carbsPer100: 0.5, fatPer100: 9.5, caloriesPer100: 140 },
      { name: 'Feta Light (Salzlakenkäse 9%)', baseAmount: 50, unit: 'g', proteinPer100: 18, carbsPer100: 1, fatPer100: 9, caloriesPer100: 160 },
      { name: 'Vollkorntoast', baseAmount: 35, unit: 'g', proteinPer100: 8.5, carbsPer100: 45, fatPer100: 2.5, caloriesPer100: 245 },
      { name: 'Babyspinat oder Tomaten', baseAmount: 50, unit: 'g', proteinPer100: 2.8, carbsPer100: 1.6, fatPer100: 0.3, caloriesPer100: 23 },
    ],
    instructions: [
      'Pfanne auf mittlerer Stufe mit einem Spritzer Ölspray erhitzen.',
      'Eiklar & Vollei kurz verquirlen, Spinat kurz andünsten und Ei darübergießen.',
      'Feta zerbröseln, drüberstreuen und 3 Min stocken lassen. Mit getoastetem Toast servieren.'
    ],
    proTip: 'Ein Esslöffel Sprudelwasser im Ei macht das Omelett doppelt so luftig.'
  },
  {
    id: 'tuna_crunch_snack',
    title: 'Thunfisch-Hüttenkäse Crunch Snack',
    category: 'snack',
    categoryLabel: 'Snack / Herzhaft',
    icon: 'fish',
    prepTimeMinutes: 3,
    difficulty: 'Blitzschnell',
    reasonWhy: 'Maximale Proteindichte bei minimalen Kohlenhydraten und Kalorien.',
    baseCalories: 320,
    baseProtein: 46,
    baseCarbs: 18,
    baseFat: 4,
    ingredients: [
      { name: 'Thunfisch im eigenen Saft (Dose)', baseAmount: 140, unit: 'g', proteinPer100: 25, carbsPer100: 0, fatPer100: 0.8, caloriesPer100: 112 },
      { name: 'Körniger Frischkäse (Magerstufe)', baseAmount: 150, unit: 'g', proteinPer100: 12.5, carbsPer100: 2.8, fatPer100: 0.4, caloriesPer100: 68 },
      { name: 'Reiswaffeln (gekrümelt)', baseAmount: 20, unit: 'g', proteinPer100: 8, carbsPer100: 80, fatPer100: 2, caloriesPer100: 380 },
    ],
    instructions: [
      'Thunfisch gut abtropfen lassen und in einer Schale mit dem körnigen Frischkäse vermengen.',
      'Mit Meersalz, grobem Pfeffer und einem Spritzer Zitrone abschmecken.',
      'Reiswaffeln grob darüberbröseln für den perfekten Crunch.'
    ],
    proTip: 'Schnittlauch oder Gurkenwürfel verleihen extra Frische ohne nennenswerte Kalorien.'
  },
  {
    id: 'casein_bedtime_pudding',
    title: 'Warm Cinnamon Casein Pudding',
    category: 'bowl',
    categoryLabel: 'Fluff / Bowl',
    icon: 'weather-night',
    prepTimeMinutes: 4,
    difficulty: 'Blitzschnell',
    reasonWhy: 'Langsame Aminosäureabgabe über Nacht, ideal vor dem Schlafen.',
    baseCalories: 340,
    baseProtein: 45,
    baseCarbs: 16,
    baseFat: 8,
    ingredients: [
      { name: 'Casein oder Mehrkomponenten-Protein', baseAmount: 35, unit: 'g', proteinPer100: 78, carbsPer100: 5, fatPer100: 2.5, caloriesPer100: 365 },
      { name: 'Magerquark', baseAmount: 150, unit: 'g', proteinPer100: 12, carbsPer100: 4, fatPer100: 0.2, caloriesPer100: 67 },
      { name: 'Erdnussbutter (100% naturbelassen)', baseAmount: 12, unit: 'g', proteinPer100: 26, carbsPer100: 12, fatPer100: 50, caloriesPer100: 600 },
      { name: 'Wasser oder Mandelmilch warm', baseAmount: 80, unit: 'ml', proteinPer100: 0.5, carbsPer100: 0.3, fatPer100: 1.1, caloriesPer100: 13 },
    ],
    instructions: [
      'Casein und Magerquark mit warmer Mandelmilch/Wasser langsam verrühren.',
      'Mit Zimt verfeinern, bis eine puddingartige Dicke entsteht.',
      'Erdnussbutter obenauf träufeln.'
    ],
    proTip: 'Casein geliert nach 2 Minuten Stehen noch nach – perfekte Pudding-Konsistenz.'
  },
  {
    id: 'chicken_wrap_blitz',
    title: 'Blitz-Hähnchen Vollkorn-Wrap',
    category: 'savory',
    categoryLabel: 'Herzhaft',
    icon: 'silverware-fork-knife',
    prepTimeMinutes: 5,
    difficulty: 'Sehr einfach',
    reasonWhy: 'Ausgewogenes Verhältnis aus komplexen Carbs und magerem Geflügelprotein.',
    baseCalories: 410,
    baseProtein: 40,
    baseCarbs: 42,
    baseFat: 7,
    ingredients: [
      { name: 'Vollkorn Tortilla Wrap', baseAmount: 60, unit: 'g', proteinPer100: 9, carbsPer100: 52, fatPer100: 6.5, caloriesPer100: 310 },
      { name: 'Gegarte Hähnchenbruststreifen', baseAmount: 120, unit: 'g', proteinPer100: 28, carbsPer100: 0.5, fatPer100: 2, caloriesPer100: 135 },
      { name: 'Magerquark (als Kräutersoße)', baseAmount: 60, unit: 'g', proteinPer100: 12, carbsPer100: 4, fatPer100: 0.2, caloriesPer100: 67 },
      { name: 'Tomate & Salatblätter', baseAmount: 50, unit: 'g', proteinPer100: 1.2, carbsPer100: 3, fatPer100: 0.2, caloriesPer100: 20 },
    ],
    instructions: [
      'Magerquark mit Salz, Pfeffer, Kräutern und einem Tropfen Essig verrühren.',
      'Vollkorn-Wrap damit bestreichen, mit Hähnchenstreifen und Gemüse belegen.',
      'Fest einrollen und schräg halbieren.'
    ],
    proTip: 'Den Wrap 60 Sekunden in einer trockenen Pfanne anrösten – wird außen knusprig!'
  },
  {
    id: 'rice_cake_choco_stack',
    title: 'Schoko-Quark Reiswaffel-Stack',
    category: 'snack',
    categoryLabel: 'Snack / Süß',
    icon: 'cake-layered',
    prepTimeMinutes: 3,
    difficulty: 'Blitzschnell',
    reasonWhy: 'Süßer Heißhunger-Killer mit viel Protein und schneller Zubereitung.',
    baseCalories: 330,
    baseProtein: 36,
    baseCarbs: 38,
    baseFat: 3,
    ingredients: [
      { name: 'Reiswaffeln natur', baseAmount: 30, unit: 'g', proteinPer100: 8, carbsPer100: 80, fatPer100: 2, caloriesPer100: 380 },
      { name: 'Magerquark', baseAmount: 180, unit: 'g', proteinPer100: 12, carbsPer100: 4, fatPer100: 0.2, caloriesPer100: 67 },
      { name: 'Schoko-Whey Pulver', baseAmount: 15, unit: 'g', proteinPer100: 80, carbsPer100: 4, fatPer100: 2.5, caloriesPer100: 380 },
      { name: 'Frische Beeren oder Banane', baseAmount: 50, unit: 'g', proteinPer100: 1, carbsPer100: 14, fatPer100: 0.2, caloriesPer100: 60 },
    ],
    instructions: [
      'Quark und Schoko-Whey mit einem Schluck Wasser zu einer Schokocreme verrühren.',
      'Reiswaffeln dick mit der Schoko-Quark-Creme bestreichen.',
      'Mit Beeren oder Bananenscheiben belegen.'
    ],
    proTip: 'Schmeckt wie süßer Schoko-Kuchen, hat aber top Nährwerte.'
  },
  {
    id: 'refreshing_berry_smoothie',
    title: 'Eiskalter Skyr-Beeren Slush',
    category: 'shake',
    categoryLabel: 'Shake',
    icon: 'shaker-outline',
    prepTimeMinutes: 2,
    difficulty: 'Blitzschnell',
    reasonWhy: 'Erfrischend, leicht und liefert schnelles Molkenprotein & Mikronährstoffe.',
    baseCalories: 310,
    baseProtein: 39,
    baseCarbs: 30,
    baseFat: 2,
    ingredients: [
      { name: 'Skyr natur oder Magerquark', baseAmount: 180, unit: 'g', proteinPer100: 11, carbsPer100: 4, fatPer100: 0.2, caloriesPer100: 64 },
      { name: 'Whey Isolat Beere/Vanille', baseAmount: 25, unit: 'g', proteinPer100: 85, carbsPer100: 2, fatPer100: 1, caloriesPer100: 360 },
      { name: 'Tiefkühl-Beerenmix', baseAmount: 120, unit: 'g', proteinPer100: 1.2, carbsPer100: 9, fatPer100: 0.5, caloriesPer100: 46 },
      { name: 'Kaltes Wasser oder Eiswürfel', baseAmount: 150, unit: 'ml', proteinPer100: 0, carbsPer100: 0, fatPer100: 0, caloriesPer100: 0 },
    ],
    instructions: [
      'Wasser, Skyr, Whey und die tiefgefrorenen Beeren in den Mixer geben.',
      'Auf Ice-Crush oder höchster Stufe 45 Sekunden durchmixen.',
      'In ein hohes Glas füllen und mit Löffel oder dickem Strohhalm genießen.'
    ],
    proTip: 'Durch die gefrorenen Beeren entsteht eine echte Slushy-Eis-Konsistenz.'
  }
];

/**
 * Mathematische Plausibilitäts-Prüfung
 * (P * 4 + C * 4 + F * 9 ~ Kcal)
 */
function validateAndNormalizeMacros(
  claimedCal: number,
  protein: number,
  carbs: number,
  fat: number
): number {
  const calculatedCal = Math.round(protein * 4 + carbs * 4 + fat * 9);
  if (claimedCal <= 0) return calculatedCal;
  // Wenn Abweichung größer als 15%, verwenden wir den errechneten Wert
  const diffPct = Math.abs(claimedCal - calculatedCal) / Math.max(1, calculatedCal);
  return diffPct > 0.15 ? calculatedCal : claimedCal;
}

/**
 * Lokale Smart-Scaling Engine
 */
function getScaledFallbackSuggestions(request: MacroCoachRequest): CoachRecipeSuggestion[] {
  const budgetCal = Math.max(200, request.remainingCalories > 0 ? request.remainingCalories : 360);
  const budgetPro = Math.max(20, request.remainingProtein > 0 ? request.remainingProtein : 35);

  let pool = FALLBACK_FITNESS_TEMPLATES;
  if (request.category && request.category !== 'all') {
    const matching = pool.filter(t => t.category === request.category);
    if (matching.length > 0) {
      pool = matching;
    }
  }

  return pool.map(tpl => {
    // Intelligenter Skalierungsfaktor bezogen auf Kalorien & Protein
    const calRatio = budgetCal / tpl.baseCalories;
    const proRatio = budgetPro / Math.max(1, tpl.baseProtein);
    // Gewichteter Mittelwert (60% Kalorien, 40% Protein), begrenzt zwischen 0.55 und 1.7
    const rawRatio = calRatio * 0.6 + proRatio * 0.4;
    const ratio = Math.min(1.7, Math.max(0.55, rawRatio));

    const ingredients: CoachIngredient[] = tpl.ingredients.map(ing => {
      const grams = Math.round(ing.baseAmount * ratio);
      const cal = Math.round((grams / 100) * ing.caloriesPer100);
      const pro = Math.round((grams / 100) * ing.proteinPer100);
      const car = Math.round((grams / 100) * ing.carbsPer100);
      const fat = Math.round((grams / 100) * ing.fatPer100);

      return {
        name: ing.name,
        amount: `${grams}${ing.unit}`,
        grams,
        calories: cal,
        protein: pro,
        carbs: car,
        fat,
      };
    });

    const totalCal = ingredients.reduce((sum, i) => sum + i.calories, 0);
    const totalPro = ingredients.reduce((sum, i) => sum + i.protein, 0);
    const totalCar = ingredients.reduce((sum, i) => sum + i.carbs, 0);
    const totalFat = ingredients.reduce((sum, i) => sum + i.fat, 0);

    const verifiedCal = validateAndNormalizeMacros(totalCal, totalPro, totalCar, totalFat);

    return {
      id: `${tpl.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: tpl.title,
      category: tpl.category,
      categoryLabel: tpl.categoryLabel,
      icon: tpl.icon,
      prepTimeMinutes: tpl.prepTimeMinutes,
      difficulty: tpl.difficulty,
      reasonWhy: tpl.reasonWhy,
      calories: verifiedCal,
      protein: totalPro,
      carbs: totalCar,
      fat: totalFat,
      ingredients,
      instructions: tpl.instructions,
      proTip: tpl.proTip,
      source: 'smart_scaler',
    };
  });
}

/**
 * Gemini API Call mit Structured JSON Mode
 */
async function callGeminiMacroCoach(
  apiKey: string,
  request: MacroCoachRequest
): Promise<CoachRecipeSuggestion[]> {
  const budgetCal = Math.max(150, request.remainingCalories);
  const budgetPro = Math.max(15, request.remainingProtein);
  const budgetCar = Math.max(0, request.remainingCarbs);
  const budgetFat = Math.max(0, request.remainingFat);

  const categoryInstruction =
    request.category && request.category !== 'all'
      ? `Konzentriere dich auf Rezepte der Kategorie "${request.category}".`
      : `Biete eine gute Mischung aus 1x Shake, 1x Bowl/Fluff, 1x herzhafte Pfanne/Wrap und 1x Snack.`;

  const systemPrompt = `Du bist ein erfahrener Fitness- und Bodybuilding-Ernährungscoach.
Deine einzige Aufgabe: Fülle die noch offenen Nährwerte des Nutzers für den heutigen Tag.

Tages-Defizit des Nutzers:
- Kalorien: ca. ${budgetCal} kcal
- Protein: ca. ${budgetPro}g
- Kohlenhydrate: ca. ${budgetCar}g
- Fett: ca. ${budgetFat}g
${categoryInstruction}

STRENGE REGELN GEGEN GENERISCHE 08/15-ANTWORTEN:
1. Keine generischen, langweiligen Standardgerichte wie "Hühnchen mit Reis und Brokkoli" oder zeitaufwändige Eintöpfe.
2. Vorschläge müssen praxiserprobte Gym-Favoriten sein:
   - Dickcremige Fluffs (Magerquark/Skyr + Whey/Casein aufgeschlagen)
   - Shakes mit Instant Oats, Beeren oder Nussmus
   - Schnelle Eiklar-Pfannen mit Feta Light oder Vollkorntoast
   - Thunfisch/Hüttenkäse-Crunches oder süße Reiswaffel-Stacks
3. Maximal 5 Zutaten pro Rezept. Zutaten müssen haushaltsüblich und schnell verfügbar sein.
4. Zubereitungszeit maximal 7 Minuten.
5. Grammgenaue Angaben für jede Zutat.
6. Die Summe der Nährwerte aller Zutaten muss den angegebenen Werten des Rezepts und dem Defizit möglichst nahe kommen.

Antworte AUSSCHLIESSLICH als valides JSON-Array ohne Markdown-Codeblöcke (\`\`\`json).`;

  const jsonSchema = {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        category: { type: 'STRING', enum: ['shake', 'bowl', 'savory', 'snack'] },
        categoryLabel: { type: 'STRING' },
        prepTimeMinutes: { type: 'INTEGER' },
        difficulty: { type: 'STRING', enum: ['Blitzschnell', 'Sehr einfach'] },
        reasonWhy: { type: 'STRING' },
        calories: { type: 'INTEGER' },
        protein: { type: 'INTEGER' },
        carbs: { type: 'INTEGER' },
        fat: { type: 'INTEGER' },
        ingredients: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              amount: { type: 'STRING' },
              grams: { type: 'INTEGER' },
              calories: { type: 'INTEGER' },
              protein: { type: 'INTEGER' },
              carbs: { type: 'INTEGER' },
              fat: { type: 'INTEGER' },
            },
            required: ['name', 'amount', 'grams', 'calories', 'protein', 'carbs', 'fat'],
          },
        },
        instructions: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
        proTip: { type: 'STRING' },
      },
      required: [
        'title',
        'category',
        'categoryLabel',
        'prepTimeMinutes',
        'difficulty',
        'reasonWhy',
        'calories',
        'protein',
        'carbs',
        'fat',
        'ingredients',
        'instructions',
        'proTip',
      ],
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;

  const payload = {
    contents: [
      {
        parts: [{ text: systemPrompt }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: jsonSchema,
      temperature: 0.4,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Keine Antwort von Gemini erhalten.');
  }

  const parsed = JSON.parse(textOutput);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Gemini lieferte kein gültiges Rezept-Array.');
  }

  // Icons zuweisen & Plausibilität prüfen
  return parsed.map((item: any, idx: number) => {
    let icon = 'food-apple';
    if (item.category === 'shake') icon = 'bottle-tonic-plus-outline';
    else if (item.category === 'bowl') icon = 'spoon-sugar';
    else if (item.category === 'savory') icon = 'egg-fried';
    else if (item.category === 'snack') icon = 'popcorn';

    const verifiedCal = validateAndNormalizeMacros(
      item.calories || 0,
      item.protein || 0,
      item.carbs || 0,
      item.fat || 0
    );

    return {
      id: `ai_${Date.now()}_${idx}`,
      title: item.title || 'Power Fitness Snack',
      category: item.category || 'snack',
      categoryLabel: item.categoryLabel || 'Fitness Snack',
      icon,
      prepTimeMinutes: item.prepTimeMinutes || 3,
      difficulty: item.difficulty || 'Blitzschnell',
      reasonWhy: item.reasonWhy || 'Perfekt abgestimmt auf deine verbleibenden Makros.',
      calories: verifiedCal,
      protein: Math.round(item.protein || 0),
      carbs: Math.round(item.carbs || 0),
      fat: Math.round(item.fat || 0),
      ingredients: (item.ingredients || []).map((ing: any) => ({
        name: ing.name || 'Zutat',
        amount: ing.amount || `${ing.grams || 50}g`,
        grams: ing.grams || 50,
        calories: ing.calories || 0,
        protein: ing.protein || 0,
        carbs: ing.carbs || 0,
        fat: ing.fat || 0,
      })),
      instructions: item.instructions && item.instructions.length > 0
        ? item.instructions
        : ['Alle Zutaten vermengen und genießen.'],
      proTip: item.proTip || 'Tipp: Kalt serviert schmeckt es am besten!',
      source: 'ai' as const,
    };
  });
}

/**
 * Haupt-Einstiegspunkt für Vorschläge
 */
export async function getCoachMealSuggestions(
  request: MacroCoachRequest
): Promise<CoachRecipeSuggestion[]> {
  // Wenn ein gültiger API-Key vorliegt, versuchen wir Gemini aufzurufen
  if (request.apiKey && request.apiKey.trim().length > 10) {
    try {
      const aiResults = await callGeminiMacroCoach(request.apiKey, request);
      if (aiResults && aiResults.length > 0) {
        return aiResults;
      }
    } catch (err) {
      console.warn('[aiNutritionCoachService] Gemini API Aufruf fehlgeschlagen, wechsle auf Smart-Scaler:', err);
    }
  }

  // Fallback: 100% robuste lokale Smart-Scaling Engine
  return getScaledFallbackSuggestions(request);
}

export type CoachId = 'pl' | 'bb' | 'cal' | 'str';

export interface CoachDef {
  id: CoachId;
  name: string;
  title: string;
  avatarEmoji: string;
  color: string;
  borderColor: string;
  perkDescription: string;
  unlockLevel: number;
}

export const COACH_DEFINITIONS: Record<CoachId, CoachDef> = {
  pl: {
    id: 'pl',
    name: 'Gerd „Big Iron“',
    title: 'Der Powerlifter',
    avatarEmoji: '🏋️‍♂️',
    color: '#F43F5E',
    borderColor: '#F43F5E90',
    perkDescription: 'Brust- & Bein-Einheiten erhalten +10% ATK. Erster Angriff im Kampf trifft garantiert kritisch.',
    unlockLevel: 7,
  },
  bb: {
    id: 'bb',
    name: 'Markus „Hypertrophie“',
    title: 'Der Bodybuilder',
    avatarEmoji: '💪',
    color: '#A855F7',
    borderColor: '#A855F790',
    perkDescription: 'Arm- & Schulter-Einheiten erhalten +10% HP. Alle Synergie-Boni sind um +5% verstärkt.',
    unlockLevel: 7,
  },
  cal: {
    id: 'cal',
    name: 'Leon „Anti-Gravity“',
    title: 'Der Calisthenics-Athlet',
    avatarEmoji: '🤸‍♂️',
    color: '#0284C7',
    borderColor: '#0284C790',
    perkDescription: 'Rücken & Core beherrschen den Raum: Schaltet ab Stage 3 dauerhaft +1 zusätzlichen Board-Slot frei.',
    unlockLevel: 14,
  },
  str: {
    id: 'str',
    name: 'Hafthor „Log-Lift“',
    title: 'Der Strongman',
    avatarEmoji: '🪨',
    color: '#F59E0B',
    borderColor: '#F59E0B90',
    perkDescription: '+2 Start-Plates zu Beginn jeder Stage. Alle Items im Run-Shop kosten 1 Plate weniger (min. 1).',
    unlockLevel: 20,
  },
};

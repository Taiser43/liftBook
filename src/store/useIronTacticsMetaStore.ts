import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChestType } from '../constants/ironTacticsChests';
import { CoachId } from '../constants/ironTacticsCoaches';
import { DAILY_QUEST_POOL, WEEKLY_QUEST_POOL, QuestDef } from '../constants/ironTacticsQuests';
import { SEASON_XP_PER_TIER, SEASON_MAX_TIER } from '../constants/ironTacticsSeason';
import {
  PumpState,
  DEFAULT_PUMP_STATE,
  calculateUpdatedPump,
  FitnessActionType,
  evaluateFitnessReward,
} from '../engine/ironTactics/fitnessBridge';
import {
  ChestSlot,
  updateChestSlotState,
  speedUpChestWithShake,
  rollChestRewards,
  ChestOpenReward,
} from '../engine/ironTactics/chestEngine';
import {
  DailyShopOffer,
  generateDailyShopOffers,
  getLocalDateKey,
} from '../engine/ironTactics/dailyShopEngine';
import {
  getXpRequiredForLevel,
  getMasteryUpgradeCost,
  calculateTrophyDelta,
} from '../engine/ironTactics/economy';
import { useAutoChessStore } from './useAutoChessStore';

export interface ActiveQuestInstance extends QuestDef {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface DeckSlot {
  id: string;
  name: string;
  cardIds: string[];
}

export interface IronTacticsMetaState {
  trophies: number;
  level: number;
  xp: number;
  eisen: number;
  shakes: number;
  pump: PumpState;
  fragments: Record<string, number>; // cardId -> fragments
  mastery: Record<string, number>; // cardId -> level 1 to 10
  decks: DeckSlot[];
  activeDeckIndex: number;
  chests: (ChestSlot | null)[];
  codex: string[]; // Unlocked item IDs
  activeCoach: CoachId | null;
  ascension: number; // 0 to 10
  season: {
    key: string;
    xp: number;
    claimedTiers: number[];
  };
  quests: {
    daily: ActiveQuestInstance[];
    weekly: ActiveQuestInstance[];
    lastDailyDate: string;
  };
  stats: {
    runsPlayed: number;
    wavesWon: number;
    highestStage: number;
    bossKills: number;
    miniBossKills: number;
    itemsCollected: number;
  };
  claimedFitness: Record<string, FitnessActionType[]>;
  ownedFrames: string[];
  equippedFrame: string;
  dailyShop: {
    lastResetDate: string;
    offers: DailyShopOffer[];
  };

  // Actions
  refreshDailyShopIfNeeded: (force?: boolean) => void;
  buyDailyCardOffer: (offerId: string) => { success: boolean; message: string; fragmentsAdded?: number };
  syncPump: () => void;
  spendPump: () => boolean;
  addPumpDirect: (amount: number) => void;
  addTrophies: (delta: number) => number;
  addEisen: (amount: number) => void;
  addShakes: (amount: number) => void;
  addTacticianXp: (amount: number) => { leveledUp: boolean; newLevel: number };
  addSeasonXp: (amount: number) => void;
  upgradeCardMastery: (cardId: string) => boolean;
  setActiveDeck: (index: number) => void;
  updateDeckCards: (deckIndex: number, cardIds: string[]) => void;
  renameDeck: (deckIndex: number, newName: string) => void;
  awardChestSlot: (type: ChestType) => { awarded: boolean; overflowEisen: number };
  startChestUnlock: (slotIndex: number) => boolean;
  speedUpChest: (slotIndex: number) => boolean;
  openChest: (slotIndex: number, availableCardIds: string[]) => ChestOpenReward | null;
  unlockItemBlueprint: (itemId: string) => void;
  setActiveCoach: (coachId: CoachId | null) => void;
  claimSeasonTier: (tier: number) => boolean;
  progressQuests: (type: QuestDef['type'], amount?: number) => void;
  claimQuest: (questId: string) => boolean;
  claimFitnessAction: (action: FitnessActionType, details?: { sets?: number; cardioDurationMinutes?: number }) => boolean;
  setEquippedFrame: (frameId: string) => void;
  recordRunCompletion: (params: {
    wavesWon: number;
    stageReached: number;
    arenaIndex: number;
    bossKills: number;
    miniBossKills: number;
    chestEarned?: ChestType;
  }) => { trophyDelta: number; eisenEarned: number; xpEarned: number };
}

const getTodayKey = (): string => new Date().toISOString().split('T')[0];

const INITIAL_DECKS: DeckSlot[] = [
  {
    id: 'deck_1',
    name: 'Standard-Deck',
    cardIds: [
      'bankdruecken',
      'fliegende',
      'latzug',
      'rudern',
      'bizeps_curls',
      'trizeps_druecken',
      'schulterdruecken',
      'kniebeugen',
    ],
  },
  {
    id: 'deck_2',
    name: 'Push / Pull Fokus',
    cardIds: ['bankdruecken', 'dips', 'latzug', 'klimmzuege', 'seitheben', 'squats', 'beinpresse', 'crunch'],
  },
  {
    id: 'deck_3',
    name: 'Bein & Core Power',
    cardIds: ['kniebeugen', 'kreuzheben', 'ausfallschritte', 'wadenheben', 'plank', 'leg_raises', 'bankdruecken', 'latzug'],
  },
];

const INITIAL_CODEX: string[] = ['chalk', 'wrist_wraps', 'knee_sleeves', 'arm_blaster'];

export const useIronTacticsMetaStore = create<IronTacticsMetaState>()(
  persist(
    (set, get) => ({
      trophies: 0,
      level: 1,
      xp: 0,
      eisen: 150,
      shakes: 3,
      pump: DEFAULT_PUMP_STATE,
      fragments: {},
      mastery: {},
      decks: INITIAL_DECKS,
      activeDeckIndex: 0,
      chests: [
        { id: 'start_chest', type: 'dumbbell', state: 'locked' },
        null,
        null,
        null,
      ],
      codex: INITIAL_CODEX,
      activeCoach: null,
      ascension: 0,
      season: {
        key: 'season_2026_10',
        xp: 0,
        claimedTiers: [],
      },
      quests: {
        daily: DAILY_QUEST_POOL.slice(0, 3).map(q => ({ ...q, progress: 0, completed: false, claimed: false })),
        weekly: WEEKLY_QUEST_POOL.map(q => ({ ...q, progress: 0, completed: false, claimed: false })),
        lastDailyDate: getTodayKey(),
      },
      stats: {
        runsPlayed: 0,
        wavesWon: 0,
        highestStage: 1,
        bossKills: 0,
        miniBossKills: 0,
        itemsCollected: 4,
      },
      claimedFitness: {},
      ownedFrames: ['frame_default'],
      equippedFrame: 'frame_default',
      dailyShop: {
        lastResetDate: '',
        offers: [],
      },

      syncPump: () => {
        const state = get();
        const updatedPump = calculateUpdatedPump(state.pump);

        let chestsChanged = false;
        const updatedChests = state.chests.map(c => {
          if (!c) return null;
          const next = updateChestSlotState(c);
          if (next !== c) {
            chestsChanged = true;
          }
          return next;
        });

        const pumpChanged = updatedPump !== state.pump;

        if (pumpChanged || chestsChanged) {
          set({
            ...(pumpChanged ? { pump: updatedPump } : {}),
            ...(chestsChanged ? { chests: updatedChests } : {}),
          });
        }
      },

      spendPump: () => {
        get().syncPump();
        const { pump } = get();
        if (pump.current < 1) return false;
        const newCurrent = pump.current - 1;
        const startsRegen = pump.current === pump.maxPassive && newCurrent < pump.maxPassive;
        set({
          pump: {
            ...pump,
            current: newCurrent,
            lastRegenAt: startsRegen ? Date.now() : pump.lastRegenAt,
          },
        });
        return true;
      },

      addPumpDirect: (amount: number) => {
        const { pump } = get();
        const newCurrent = Math.min(pump.maxOverpump, pump.current + amount);
        set({ pump: { ...pump, current: newCurrent } });
      },

      addTrophies: (delta: number) => {
        const current = get().trophies;
        const next = Math.max(0, current + delta);
        set({ trophies: next });
        // Also sync with useAutoChessStore trophies
        try {
          useAutoChessStore.setState({ trophies: next });
        } catch {
          // ignore
        }
        return next;
      },

      addEisen: (amount: number) => {
        set(state => ({ eisen: Math.max(0, state.eisen + amount) }));
      },

      addShakes: (amount: number) => {
        set(state => ({ shakes: Math.max(0, state.shakes + amount) }));
      },

      addTacticianXp: (amount: number) => {
        const state = get();
        let currentLvl = state.level;
        let currentXp = state.xp + amount;
        let leveledUp = false;

        while (currentLvl < 50) {
          const cost = getXpRequiredForLevel(currentLvl);
          if (currentXp >= cost) {
            currentXp -= cost;
            currentLvl++;
            leveledUp = true;
          } else {
            break;
          }
        }

        set({ level: currentLvl, xp: currentXp });
        return { leveledUp, newLevel: currentLvl };
      },

      addSeasonXp: (amount: number) => {
        set(state => ({
          season: {
            ...state.season,
            xp: state.season.xp + amount,
          },
        }));
      },

      upgradeCardMastery: (cardId: string) => {
        const state = get();
        const currentMastery = state.mastery[cardId] || 1;
        const cost = getMasteryUpgradeCost(currentMastery);
        if (!cost) return false;

        const currentFrags = state.fragments[cardId] || 0;
        if (currentFrags < cost.fragments || state.eisen < cost.eisen) {
          return false;
        }

        set({
          eisen: state.eisen - cost.eisen,
          fragments: {
            ...state.fragments,
            [cardId]: currentFrags - cost.fragments,
          },
          mastery: {
            ...state.mastery,
            [cardId]: currentMastery + 1,
          },
        });
        return true;
      },

      setActiveDeck: (index: number) => {
        if (index >= 0 && index < get().decks.length) {
          set({ activeDeckIndex: index });
        }
      },

      updateDeckCards: (deckIndex: number, cardIds: string[]) => {
        const decks = [...get().decks];
        if (decks[deckIndex]) {
          decks[deckIndex] = { ...decks[deckIndex], cardIds };
          set({ decks });
        }
      },

      renameDeck: (deckIndex: number, newName: string) => {
        const decks = [...get().decks];
        if (decks[deckIndex]) {
          decks[deckIndex] = { ...decks[deckIndex], name: newName.trim() || `Deck ${deckIndex + 1}` };
          set({ decks });
        }
      },

      awardChestSlot: (type: ChestType) => {
        const state = get();
        const emptyIdx = state.chests.findIndex(c => c === null);

        if (emptyIdx === -1) {
          // All slots full: Convert to overflow Eisen
          const overflowEisen = type === 'titan_shrine' ? 500 : type === 'vault' ? 200 : type === 'locker' ? 85 : 35;
          set({ eisen: state.eisen + overflowEisen });
          return { awarded: false, overflowEisen };
        }

        const newChests = [...state.chests];
        newChests[emptyIdx] = {
          id: `chest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type,
          state: 'locked',
        };
        set({ chests: newChests });
        return { awarded: true, overflowEisen: 0 };
      },

      startChestUnlock: (slotIndex: number) => {
        const state = get();
        const chest = state.chests[slotIndex];
        if (!chest || chest.state !== 'locked') return false;

        // Check if another chest is already unlocking
        const alreadyUnlocking = state.chests.some(c => c && c.state === 'unlocking');
        if (alreadyUnlocking) return false;

        const durationSec =
          chest.type === 'titan_shrine' ? 86400 : chest.type === 'vault' ? 28800 : chest.type === 'locker' ? 10800 : 1800;
        const now = Date.now();

        const newChests = [...state.chests];
        newChests[slotIndex] = {
          ...chest,
          state: 'unlocking',
          startedAt: now,
          unlocksAt: now + durationSec * 1000,
        };
        set({ chests: newChests });
        return true;
      },

      speedUpChest: (slotIndex: number) => {
        const state = get();
        if (state.shakes < 1) return false;
        const chest = state.chests[slotIndex];
        if (!chest || chest.state !== 'unlocking') return false;

        const { updatedSlot } = speedUpChestWithShake(chest);
        const newChests = [...state.chests];
        newChests[slotIndex] = updatedSlot;

        set({
          shakes: state.shakes - 1,
          chests: newChests,
        });
        return true;
      },

      openChest: (slotIndex: number, availableCardIds: string[]) => {
        const state = get();
        const chest = state.chests[slotIndex];
        if (!chest || chest.state !== 'ready') return null;

        const rewards = rollChestRewards(chest.type, availableCardIds, state.codex);

        // Distribute Eisen & fragments
        const newFragments = { ...state.fragments };
        Object.entries(rewards.fragments).forEach(([cId, count]) => {
          newFragments[cId] = (newFragments[cId] || 0) + count;
        });

        // Add blueprint if rolled
        const newCodex = [...state.codex];
        if (rewards.blueprintItem && !newCodex.includes(rewards.blueprintItem.id)) {
          newCodex.push(rewards.blueprintItem.id);
        }

        // Add cosmetic frame if rolled
        const newFrames = [...state.ownedFrames];
        if (rewards.cosmeticFrameId && !newFrames.includes(rewards.cosmeticFrameId)) {
          newFrames.push(rewards.cosmeticFrameId);
        }

        const newChests = [...state.chests];
        newChests[slotIndex] = null; // Free up slot

        set({
          eisen: state.eisen + rewards.eisen,
          fragments: newFragments,
          codex: newCodex,
          ownedFrames: newFrames,
          chests: newChests,
        });

        return rewards;
      },

      unlockItemBlueprint: (itemId: string) => {
        const state = get();
        if (!state.codex.includes(itemId)) {
          set({ codex: [...state.codex, itemId] });
        }
      },

      setActiveCoach: (coachId: CoachId | null) => {
        set({ activeCoach: coachId });
      },

      claimSeasonTier: (tier: number) => {
        const state = get();
        const currentTier = Math.min(SEASON_MAX_TIER, Math.floor(state.season.xp / SEASON_XP_PER_TIER));
        if (tier > currentTier || state.season.claimedTiers.includes(tier)) {
          return false;
        }

        // Tier rewards
        if (tier % 7 === 0) {
          get().addShakes(2);
        } else if (tier % 5 === 0) {
          get().awardChestSlot(tier === 25 ? 'vault' : 'locker');
        } else if (tier === 30) {
          set(s => ({
            ownedFrames: [...s.ownedFrames, 'season_apex'],
            equippedFrame: 'season_apex',
          }));
        } else {
          get().addEisen(40 + tier * 4);
        }

        set(s => ({
          season: {
            ...s.season,
            claimedTiers: [...s.season.claimedTiers, tier],
          },
        }));
        return true;
      },

      progressQuests: (type: QuestDef['type'], amount: number = 1) => {
        set(state => {
          const updateList = (list: ActiveQuestInstance[]) =>
            list.map(q => {
              if (q.type === type && !q.completed) {
                const newProg = q.progress + amount;
                return {
                  ...q,
                  progress: newProg,
                  completed: newProg >= q.goal,
                };
              }
              return q;
            });

          return {
            quests: {
              ...state.quests,
              daily: updateList(state.quests.daily),
              weekly: updateList(state.quests.weekly),
            },
          };
        });
      },

      claimQuest: (questId: string) => {
        const state = get();
        let foundQuest: ActiveQuestInstance | undefined = undefined;

        const updateList = (list: ActiveQuestInstance[]) =>
          list.map(q => {
            if (q.id === questId && q.completed && !q.claimed) {
              foundQuest = q;
              return { ...q, claimed: true };
            }
            return q;
          });

        const newDaily = updateList(state.quests.daily);
        const newWeekly = updateList(state.quests.weekly);

        if (!foundQuest) return false;

        const target = foundQuest as ActiveQuestInstance;
        get().addEisen(target.eisenReward);
        get().addSeasonXp(target.seasonXpReward);
        get().addTacticianXp(30);

        set({
          quests: {
            ...state.quests,
            daily: newDaily,
            weekly: newWeekly,
          },
        });
        return true;
      },

      claimFitnessAction: (action: FitnessActionType, details) => {
        const state = get();
        const today = getTodayKey();
        const claimedToday = state.claimedFitness[today] || [];

        // Avoid claiming the same single action multiple times per day (except repeat workouts if applicable)
        if (claimedToday.includes(action) && action !== 'workout_completed') {
          return false;
        }

        const rewards = evaluateFitnessReward(action, details);

        if (rewards.pumpAdded > 0) get().addPumpDirect(rewards.pumpAdded);
        if (rewards.shakesAdded > 0) get().addShakes(rewards.shakesAdded);
        if (rewards.tacticianXpAdded > 0) get().addTacticianXp(rewards.tacticianXpAdded);
        if (rewards.seasonXpAdded > 0) get().addSeasonXp(rewards.seasonXpAdded);
        if (rewards.freeChestType) get().awardChestSlot(rewards.freeChestType);

        // Progress matching quests
        if (action === 'workout_completed') get().progressQuests('workout', 1);
        if (action === 'nutrition_hit') get().progressQuests('nutrition', 1);
        if (action === 'cardio_completed') get().progressQuests('cardio', 1);

        set({
          claimedFitness: {
            ...state.claimedFitness,
            [today]: [...claimedToday, action],
          },
        });
        return true;
      },

      setEquippedFrame: (frameId: string) => {
        if (get().ownedFrames.includes(frameId)) {
          set({ equippedFrame: frameId });
        }
      },

      refreshDailyShopIfNeeded: (force = false) => {
        const todayKey = getLocalDateKey();
        const currentShop = get().dailyShop;
        if (
          force ||
          !currentShop ||
          currentShop.lastResetDate !== todayKey ||
          !currentShop.offers ||
          currentShop.offers.length !== 4
        ) {
          const newOffers = generateDailyShopOffers(todayKey);
          set({
            dailyShop: {
              lastResetDate: todayKey,
              offers: newOffers,
            },
          });
        }
      },

      buyDailyCardOffer: (offerId: string) => {
        const state = get();
        const shop = state.dailyShop;
        if (!shop || !shop.offers) {
          return { success: false, message: 'Shop-Angebote werden geladen...' };
        }

        const offer = shop.offers.find(o => o.id === offerId);
        if (!offer) {
          return { success: false, message: 'Angebot nicht gefunden.' };
        }

        if (offer.purchased) {
          return { success: false, message: 'Heute bereits gekauft! Neuer Reset um 24:00 Uhr.' };
        }

        if (state.eisen < offer.costEisen) {
          return { success: false, message: `Nicht genug Eisen. Du benötigst ${offer.costEisen} Eisen.` };
        }

        const updatedOffers = shop.offers.map(o => (o.id === offerId ? { ...o, purchased: true } : o));
        const currentFrags = state.fragments[offer.id] || 0;

        set({
          eisen: state.eisen - offer.costEisen,
          fragments: {
            ...state.fragments,
            [offer.id]: currentFrags + offer.fragments,
          },
          dailyShop: {
            ...shop,
            offers: updatedOffers,
          },
        });

        return {
          success: true,
          message: `+${offer.fragments} Fragmente für ${offer.name} erhalten!`,
          fragmentsAdded: offer.fragments,
        };
      },

      recordRunCompletion: ({ wavesWon, stageReached, arenaIndex, bossKills, miniBossKills, chestEarned }) => {
        const trophyDelta = calculateTrophyDelta(wavesWon, arenaIndex, bossKills);
        get().addTrophies(trophyDelta);

        const eisenEarned = wavesWon * 8 + miniBossKills * 25 + bossKills * 60;
        get().addEisen(eisenEarned);

        const xpEarned = wavesWon * 6 + bossKills * 50;
        get().addTacticianXp(xpEarned);
        get().addSeasonXp(wavesWon * 4 + bossKills * 20);

        if (chestEarned) {
          get().awardChestSlot(chestEarned);
        }

        // Quests
        get().progressQuests('waves', wavesWon);
        if (miniBossKills > 0) get().progressQuests('mini', miniBossKills);
        if (bossKills > 0) get().progressQuests('boss', bossKills);

        set(state => ({
          stats: {
            runsPlayed: state.stats.runsPlayed + 1,
            wavesWon: state.stats.wavesWon + wavesWon,
            highestStage: Math.max(state.stats.highestStage, stageReached),
            bossKills: state.stats.bossKills + bossKills,
            miniBossKills: state.stats.miniBossKills + miniBossKills,
            itemsCollected: state.stats.itemsCollected,
          },
        }));

        return { trophyDelta, eisenEarned, xpEarned };
      },
    }),
    {
      name: 'pt-irontactics-meta',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => state => {
        if (state) {
          // One-time migration: If trophies are 0, check if useAutoChessStore has existing trophies
          if (state.trophies === 0) {
            try {
              const legacyTrophies = useAutoChessStore.getState().trophies;
              if (typeof legacyTrophies === 'number' && legacyTrophies > 0) {
                state.trophies = legacyTrophies;
                // Seed level from trophies
                state.level = Math.min(50, Math.max(1, Math.floor(legacyTrophies / 150) + 1));
              }
            } catch {
              // ignore
            }
          }
          state.syncPump();
          state.refreshDailyShopIfNeeded();
        }
      },
    }
  )
);

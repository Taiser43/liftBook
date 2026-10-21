export interface PumpState {
  current: number; // 0 to 8
  maxPassive: number; // 5
  maxOverpump: number; // 8
  lastRegenAt: number; // epoch ms
  regenIntervalMs: number; // 2.5 hours = 9000000 ms
}

export const DEFAULT_PUMP_STATE: PumpState = {
  current: 5,
  maxPassive: 5,
  maxOverpump: 8,
  lastRegenAt: Date.now(),
  regenIntervalMs: 2.5 * 3600 * 1000,
};

/**
 * Calculates updated pump charges based on elapsed time without running timers.
 */
export const calculateUpdatedPump = (pump: PumpState, now: number = Date.now()): PumpState => {
  if (pump.current >= pump.maxPassive) {
    return pump;
  }

  const elapsed = Math.max(0, now - pump.lastRegenAt);
  const gained = Math.floor(elapsed / pump.regenIntervalMs);

  if (gained <= 0) return pump;

  const newCurrent = Math.min(pump.maxPassive, pump.current + gained);
  const remainingTimeOffset = elapsed % pump.regenIntervalMs;

  return {
    ...pump,
    current: newCurrent,
    lastRegenAt: newCurrent >= pump.maxPassive ? now : now - remainingTimeOffset,
  };
};

/**
 * Seconds until next passive pump regeneration charge.
 */
export const getSecondsUntilNextPump = (pump: PumpState, now: number = Date.now()): number => {
  if (pump.current >= pump.maxPassive) return 0;
  const elapsed = now - pump.lastRegenAt;
  const remainingMs = Math.max(0, pump.regenIntervalMs - (elapsed % pump.regenIntervalMs));
  return Math.ceil(remainingMs / 1000);
};

export type FitnessActionType =
  | 'workout_completed'
  | 'nutrition_hit'
  | 'cardio_completed'
  | 'supplements_completed'
  | 'perfect_day';

export interface FitnessRewardResult {
  action: FitnessActionType;
  pumpAdded: number;
  shakesAdded: number;
  tacticianXpAdded: number;
  seasonXpAdded: number;
  freeChestType?: 'dumbbell';
  message: string;
}

export const evaluateFitnessReward = (
  action: FitnessActionType,
  details?: { sets?: number; cardioDurationMinutes?: number }
): FitnessRewardResult => {
  switch (action) {
    case 'workout_completed': {
      const sets = details?.sets || 10;
      if (sets >= 10) {
        return {
          action,
          pumpAdded: 3,
          shakesAdded: 3,
          tacticianXpAdded: 80,
          seasonXpAdded: 60,
          message: '🏋️ Workout abgeschlossen! +3 Pump (Überpump), 3 Shakes & +80 XP.',
        };
      }
      return {
        action,
        pumpAdded: 1,
        shakesAdded: 1,
        tacticianXpAdded: 40,
        seasonXpAdded: 30,
        message: '🏋️ Kurzes Workout geloggt! +1 Pump, 1 Shake & +40 XP.',
      };
    }

    case 'nutrition_hit':
      return {
        action,
        pumpAdded: 0,
        shakesAdded: 1,
        tacticianXpAdded: 40,
        seasonXpAdded: 40,
        message: '🍎 Kcal- & Protein-Ziel erreicht! +1 Shake & +40 Saison-XP.',
      };

    case 'cardio_completed': {
      const mins = details?.cardioDurationMinutes || 20;
      const pump = mins >= 20 ? 1 : 0;
      return {
        action,
        pumpAdded: pump,
        shakesAdded: 1,
        tacticianXpAdded: 30,
        seasonXpAdded: 30,
        message: `🏃 Cardio (${mins} min) beendet! +${pump} Pump, 1 Shake & +30 XP.`,
      };
    }

    case 'supplements_completed':
      return {
        action,
        pumpAdded: 0,
        shakesAdded: 1,
        tacticianXpAdded: 20,
        seasonXpAdded: 20,
        message: '💊 Alle Supplements genommen! +1 Shake & +20 XP.',
      };

    case 'perfect_day':
      return {
        action,
        pumpAdded: 1,
        shakesAdded: 2,
        tacticianXpAdded: 100,
        seasonXpAdded: 80,
        freeChestType: 'dumbbell',
        message: '💎 Perfekter Tag (Training + Ernährung)! +1 Hantel-Kiste & 2 Shakes.',
      };
  }
};

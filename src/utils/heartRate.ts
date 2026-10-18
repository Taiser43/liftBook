export function getHeartRateZoneColor(currentHr: number, maxHr: number = 190): string | null {
  if (currentHr === 0) return null;
  const percent = currentHr / maxHr;
  if (percent >= 0.9) return '#FF3B30'; // Zone 5: Red
  if (percent >= 0.8) return '#FF9500'; // Zone 4: Orange
  if (percent >= 0.7) return '#FFD700'; // Zone 3: Yellow
  if (percent >= 0.6) return '#30D158'; // Zone 2: Green
  if (percent >= 0.5) return '#00D2FF'; // Zone 1: Blue
  return '#888888'; // Below Zone 1 (Gray/Neutral)
}

export type AccentThemeId = 'cyan' | 'neutral' | 'sapphire' | 'emerald' | 'purple' | 'amber' | 'rose';

export interface AppThemePalette {
  id: AccentThemeId;
  name: string;
  subtitle: string;
  accent: string;
  accentRgb: string;
  cardBg: string;
  subCardBg: string;
  bannerBg: string;
  cardBorder: string;
  subtleBorder: string;
  accentSoftBg: string;
  accentBgSoft: string;
  accentBorder: string;
  accentBorderSoft: string;
}

export const APP_THEMES: Record<AccentThemeId, AppThemePalette> = {
  cyan: {
    id: 'cyan',
    name: 'Cyber Cyan',
    subtitle: 'Kühler Eisblau-Schimmer (Standard)',
    accent: '#00D2FF',
    accentRgb: '0, 210, 255',
    cardBg: '#161C22',
    subCardBg: '#12171D',
    bannerBg: '#12202B',
    cardBorder: 'rgba(0, 210, 255, 0.28)',
    subtleBorder: '#232E38',
    accentSoftBg: 'rgba(0, 210, 255, 0.14)',
    accentBgSoft: 'rgba(0, 210, 255, 0.14)',
    accentBorder: 'rgba(0, 210, 255, 0.40)',
    accentBorderSoft: 'rgba(0, 210, 255, 0.40)',
  },
  neutral: {
    id: 'neutral',
    name: 'Neutral Schwarz',
    subtitle: 'Graue Widgets & Standard Cyan-Grün',
    accent: '#00D2FF',
    accentRgb: '0, 210, 255',
    cardBg: '#181818',
    subCardBg: '#121212',
    bannerBg: '#1E1E1E',
    cardBorder: 'rgba(0, 210, 255, 0.22)',
    subtleBorder: '#282828',
    accentSoftBg: 'rgba(0, 210, 255, 0.14)',
    accentBgSoft: 'rgba(0, 210, 255, 0.14)',
    accentBorder: 'rgba(0, 210, 255, 0.40)',
    accentBorderSoft: 'rgba(0, 210, 255, 0.40)',
  },
  sapphire: {
    id: 'sapphire',
    name: 'Ocean Sapphire',
    subtitle: 'Tiefes Saphirblau',
    accent: '#3B82F6',
    accentRgb: '59, 130, 246',
    cardBg: '#141A26',
    subCardBg: '#101520',
    bannerBg: '#131F33',
    cardBorder: 'rgba(59, 130, 246, 0.32)',
    subtleBorder: '#222C40',
    accentSoftBg: 'rgba(59, 130, 246, 0.15)',
    accentBgSoft: 'rgba(59, 130, 246, 0.15)',
    accentBorder: 'rgba(59, 130, 246, 0.42)',
    accentBorderSoft: 'rgba(59, 130, 246, 0.42)',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Glow',
    subtitle: 'Smaragdgrüner Schimmer',
    accent: '#10B981',
    accentRgb: '16, 185, 129',
    cardBg: '#141F1C',
    subCardBg: '#101816',
    bannerBg: '#112620',
    cardBorder: 'rgba(16, 185, 129, 0.30)',
    subtleBorder: '#21352F',
    accentSoftBg: 'rgba(16, 185, 129, 0.15)',
    accentBgSoft: 'rgba(16, 185, 129, 0.15)',
    accentBorder: 'rgba(16, 185, 129, 0.40)',
    accentBorderSoft: 'rgba(16, 185, 129, 0.40)',
  },
  purple: {
    id: 'purple',
    name: 'Amethyst Neon',
    subtitle: 'Violetter Cyberpunk-Schimmer',
    accent: '#A855F7',
    accentRgb: '168, 85, 247',
    cardBg: '#1B1625',
    subCardBg: '#14111D',
    bannerBg: '#211633',
    cardBorder: 'rgba(168, 85, 247, 0.30)',
    subtleBorder: '#2D243D',
    accentSoftBg: 'rgba(168, 85, 247, 0.15)',
    accentBgSoft: 'rgba(168, 85, 247, 0.15)',
    accentBorder: 'rgba(168, 85, 247, 0.40)',
    accentBorderSoft: 'rgba(168, 85, 247, 0.40)',
  },
  amber: {
    id: 'amber',
    name: 'Solar Gold',
    subtitle: 'Warmer Bernstein-Schimmer',
    accent: '#F59E0B',
    accentRgb: '245, 158, 11',
    cardBg: '#211B14',
    subCardBg: '#19140F',
    bannerBg: '#2B2012',
    cardBorder: 'rgba(245, 158, 11, 0.30)',
    subtleBorder: '#382D21',
    accentSoftBg: 'rgba(245, 158, 11, 0.15)',
    accentBgSoft: 'rgba(245, 158, 11, 0.15)',
    accentBorder: 'rgba(245, 158, 11, 0.40)',
    accentBorderSoft: 'rgba(245, 158, 11, 0.40)',
  },
  rose: {
    id: 'rose',
    name: 'Crimson Pulse',
    subtitle: 'Intensiver Rubin-Schimmer',
    accent: '#F43F5E',
    accentRgb: '244, 63, 94',
    cardBg: '#221519',
    subCardBg: '#1A1014',
    bannerBg: '#2E151E',
    cardBorder: 'rgba(244, 63, 94, 0.30)',
    subtleBorder: '#3B232B',
    accentSoftBg: 'rgba(244, 63, 94, 0.15)',
    accentBgSoft: 'rgba(244, 63, 94, 0.15)',
    accentBorder: 'rgba(244, 63, 94, 0.40)',
    accentBorderSoft: 'rgba(244, 63, 94, 0.40)',
  },
};

export const THEME_LIST: AppThemePalette[] = Object.values(APP_THEMES);

export const getAppTheme = (id?: AccentThemeId | string | null): AppThemePalette => {
  if (id && id in APP_THEMES) {
    return APP_THEMES[id as AccentThemeId];
  }
  return APP_THEMES.cyan;
};

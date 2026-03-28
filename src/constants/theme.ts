import '@/global.css';
import { Platform } from 'react-native';

export const Brand = {
  primary: '#469264',
  accent: '#2D6A4F',
  primaryLight: '#6FB88A',
  primaryMuted: '#D0E8D8',
  primaryFaint: '#EEF7F2',
} as const;

export const Colors = {
  light: {
    text: '#0D1F1C',
    textSecondary: '#4A6B63',
    textTertiary: '#7A9990',
    background: '#FFFFFF',
    backgroundCard: '#F7FAF8',
    backgroundElement: '#EEF7F2',
    backgroundSelected: '#D0E8D8',
    border: '#D0E8D8',
    tabBar: '#FFFFFF',
    tint: '#469264',
  },
  dark: {
    text: '#E8F3EF',
    textSecondary: '#8AB3A8',
    textTertiary: '#5A8070',
    background: '#0D1412',
    backgroundCard: '#141F1C',
    backgroundElement: '#1A2B26',
    backgroundSelected: '#1E3830',
    border: '#1E3830',
    tabBar: '#0D1412',
    tint: '#6FB88A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Height of the custom tab bar — screens use this for bottom content padding
export const BottomTabInset = Platform.select({ ios: 82, android: 72 }) ?? 72;
export const MaxContentWidth = 800;

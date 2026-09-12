/**
 * Study Karnataka — Official Design System Tokens
 */

export const colors = {
  // Primary Brand Palette
  primaryBlue: '#084B7A',
  deepBlue: '#004475',
  mediumBlue: '#075488',
  hoverBlue: '#063F69',
  softBlue: '#EAF3F9',
  veryLightBlue: '#F4F8FB',

  // Legacy mappings pointing to Primary Brand Blue
  primaryRed: '#084B7A',
  darkRed: '#004475',
  warmOrange: '#F59E0B',

  // Neutrals
  darkHeading: '#111827',
  bodyText: '#334155',
  secondaryText: '#64748B',
  pageBackground: '#F7F9FC',
  cardBackground: '#FFFFFF',
  border: '#DCE6EE',

  // Supporting Soft Colors
  softRed: '#FDECEC',
  softOrange: '#FFF5E6',
  softGreen: '#ECFDF5',
  softViolet: '#F5EEFF',
  softYellow: '#FFF9E8',

  // Semantic Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF2323',
  info: '#084B7A',
  disabled: '#94A3B8',
  focus: '#084B7A',
  hover: '#063F69',
  selectedBg: '#EAF3F9',
  selectedText: '#084B7A',
} as const;

export const typography = {
  fontFamily: "'Inter', system-ui, -apple-system, 'Noto Sans Kannada', sans-serif",
  scale: {
    pageTitle: { fontSize: '28px', lineHeight: '36px', fontWeight: '700' },
    sectionTitle: { fontSize: '22px', lineHeight: '28px', fontWeight: '600' },
    cardTitle: { fontSize: '18px', lineHeight: '24px', fontWeight: '600' },
    largeMetric: { fontSize: '32px', lineHeight: '40px', fontWeight: '700' },
    bodyText: { fontSize: '14px', lineHeight: '22px', fontWeight: '400' },
    formLabel: { fontSize: '14px', lineHeight: '20px', fontWeight: '500' },
    helperText: { fontSize: '12px', lineHeight: '16px', fontWeight: '400' },
    caption: { fontSize: '12px', lineHeight: '16px', fontWeight: '500' },
  },
} as const;

export const radius = {
  control: '10px',
  card: '16px',
  panel: '20px',
  pill: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  card: '0 4px 12px 0 rgba(0, 0, 0, 0.03), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
  lg: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

export const themeTokens = {
  colors,
  typography,
  radius,
  shadows,
  breakpoints,
};

export default themeTokens;

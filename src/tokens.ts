// ─── Design Tokens ───────────────────────────────────────────────────────────
// Single source of truth for colors, spacing, radii, shadows, and patterns.
// Import from here instead of repeating raw values across components.

// Brand — storm-coast palette (navy / teal / ice / sand)
export const brand = {
  DEFAULT:      '#1B6E77',               // Primary action, header bg
  dark:         '#165B62',               // Hover on primary
  deep:         '#10141A',               // ActivityBar background (storm navy)
  label:        '#104247',               // Small all-caps field labels
  cardBg:       'rgba(27,110,119,0.07)', // TurquoiseCard surface
  cardBorder:   'rgba(27,110,119,0.20)', // TurquoiseCard border (NewBuilding/Setup)
  cardDivider:  'rgba(27,110,119,0.15)', // Inside card dividers
  chipBg:       '#DDE9EC',               // Ice-blue chip background
  chipText:     '#104247',               // Ice-blue chip text
  accent:       '#AD8F6E',               // Sand accent — used sparingly
  accentBg:     'rgba(173,143,110,0.16)',// Sand accent chip background
} as const;

// Severity — damage classification
export const severity = {
  critical: { dot: '#EF4444', bg: 'rgba(239,68,68,0.09)',   label: 'Crítica' },
  high:     { dot: '#F97316', bg: 'rgba(249,115,22,0.09)',  label: 'Alta'    },
  medium:   { dot: '#FBBF24', bg: 'rgba(251,191,36,0.09)',  label: 'Media'   },
  low:      { dot: '#10B981', bg: 'rgba(16,185,129,0.09)',  label: 'Baja'    },
} as const;

// Status — robot connection states
export const robotStatus = {
  listo:        { dot: '#10B981', chip: 'bg-[#DDE9EC] text-[#104247]',     label: 'Listo'               },
  espera:       { dot: '#FBBF24', chip: 'bg-[#FFFBEB] text-[#92400E]',     label: 'Conectado en espera' },
  desconectado: { dot: '#EF4444', chip: 'bg-[#FEF2F2] text-[#991B1B]',     label: 'Desconectado'        },
} as const;

// Surface / backgrounds
export const surface = {
  app:       '#F3F1ED',                  // App-level background
  card:      '#FFFFFF',                  // White card
  input:     'rgba(255,255,255,0.60)',   // Input background
  inputHover:'rgba(255,255,255,0.80)',   // Input hover
  border:    '#EDEBE6',                  // White card border
  divider:   '#F0EDE8',                  // Row divider inside cards
  warm:      '#F8F7F5',                  // Hover row background
} as const;

// Text
export const text = {
  primary:     '#1A1C1E',
  secondary:   '#2D2F31',
  muted:       '#66686A',
  subtle:      '#8A8C8E',
  placeholder: '#A0A2A4',
} as const;

// Spacing scale (matches Tailwind default, base 4px)
export const spacing = {
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  8:  '32px',
  10: '40px',
  12: '48px',
} as const;

// Border radius
export const radius = {
  sm:  '8px',   // rounded-lg  — inputs, chips, small buttons
  md:  '12px',  // rounded-xl  — primary buttons, panel cards
  lg:  '16px',  // rounded-2xl — content cards, modals
} as const;

// Elevation / shadows
export const shadows = {
  card:   '0 2px 16px rgba(0,0,0,0.07)',
  float:  '0 2px 12px rgba(0,0,0,0.08)',
  modal:  '0 8px 48px rgba(0,0,0,0.16)',
  brand:  '0 2px 12px rgba(27,110,119,0.30)',
  brandSm:'0 2px 10px rgba(27,110,119,0.25)',
} as const;

// Grid background pattern (content area behind cards)
export const gridBg = {
  backgroundColor: surface.app,
  backgroundImage: [
    'linear-gradient(rgba(229,231,235,0.17) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(229,231,235,0.17) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: '22px 22px',
} as const;

// White floor-plan grid (used inside SVG canvas areas)
export const whitePlanBg = {
  backgroundColor: '#FFFFFF',
  backgroundImage: [
    'linear-gradient(rgba(229,231,235,0.17) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(229,231,235,0.17) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: '22px 22px',
} as const;

// Nav bar height
export const navHeight = '48px'; // h-12

// Centralized Theme and Appearance helper for Tanzanian EBS

import { PrimaryColor, ThemeMode, FontSize, BackgroundStyle } from '../types';

export interface ColorScheme {
  id: PrimaryColor;
  name: string;
  previewClass: string;
  primary: string;
  primaryHover: string;
  bgLight: string;
  bgGradient: string;
  border: string;
  text: string;
  badge: string;
  ring: string;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'emerald',
    name: 'Emerald Green (Kijani)',
    previewClass: 'bg-emerald-500',
    primary: 'bg-emerald-600',
    primaryHover: 'hover:bg-emerald-500',
    bgLight: 'bg-emerald-950/40',
    bgGradient: 'from-emerald-600 to-teal-700',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    ring: 'focus:ring-emerald-500',
  },
  {
    id: 'blue',
    name: 'Ocean Blue (Bluu)',
    previewClass: 'bg-blue-500',
    primary: 'bg-blue-600',
    primaryHover: 'hover:bg-blue-500',
    bgLight: 'bg-blue-950/40',
    bgGradient: 'from-blue-600 to-cyan-700',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    ring: 'focus:ring-blue-500',
  },
  {
    id: 'purple',
    name: 'Royal Violet (Zambarau)',
    previewClass: 'bg-purple-500',
    primary: 'bg-purple-600',
    primaryHover: 'hover:bg-purple-500',
    bgLight: 'bg-purple-950/40',
    bgGradient: 'from-purple-600 to-indigo-700',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    ring: 'focus:ring-purple-500',
  },
  {
    id: 'amber',
    name: 'Gold Amber (Dhahabu)',
    previewClass: 'bg-amber-500',
    primary: 'bg-amber-600',
    primaryHover: 'hover:bg-amber-500',
    bgLight: 'bg-amber-950/40',
    bgGradient: 'from-amber-600 to-orange-700',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    ring: 'focus:ring-amber-500',
  },
  {
    id: 'rose',
    name: 'Ruby Rose (Nyekundu Tulivu)',
    previewClass: 'bg-rose-500',
    primary: 'bg-rose-600',
    primaryHover: 'hover:bg-rose-500',
    bgLight: 'bg-rose-950/40',
    bgGradient: 'from-rose-600 to-pink-700',
    border: 'border-rose-500/40',
    text: 'text-rose-400',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    ring: 'focus:ring-rose-500',
  },
  {
    id: 'slate',
    name: 'Titanium Slate (Kijivu)',
    previewClass: 'bg-slate-500',
    primary: 'bg-slate-700',
    primaryHover: 'hover:bg-slate-600',
    bgLight: 'bg-slate-900/60',
    bgGradient: 'from-slate-700 to-zinc-800',
    border: 'border-slate-600/40',
    text: 'text-slate-200',
    badge: 'bg-slate-700/40 text-slate-200 border-slate-600/30',
    ring: 'focus:ring-slate-400',
  },
];

export const COLOR_SCHEMES_MAP: Record<PrimaryColor, ColorScheme> = COLOR_SCHEMES.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {} as Record<PrimaryColor, ColorScheme>);

export function getColorScheme(primary: PrimaryColor = 'emerald'): ColorScheme {
  return COLOR_SCHEMES_MAP[primary] || COLOR_SCHEMES[0];
}

export const THEME_MODES: { id: ThemeMode; name: string; desc: string }[] = [
  { id: 'dark', name: 'Dark Mode (Usiku)', desc: 'Nzuri kwa Bar, Pub & mazingira ya mwanga mdogo' },
  { id: 'light', name: 'Light Mode (Mchana)', desc: 'Nzuri kwa Maduka ya Jumla & Ofisi zenye mwanga' },
  { id: 'oled', name: 'OLED Pure Black', desc: 'Inaokoa betri ya simu na kuongeza usomaji' },
];

export const FONT_SIZES: { id: FontSize; name: string; desc: string }[] = [
  { id: 'small', name: 'Ndogo (Compact)', desc: 'Inaonyesha taarifa nyingi kwa skrini ndogo' },
  { id: 'normal', name: 'Kawaida (Default)', desc: 'Ukubwa unaopendekezwa kwa matumizi ya kila siku' },
  { id: 'large', name: 'Kubwa (Large)', desc: 'Maandishi makubwa na vitufe vinavyoonekana kirahisi' },
];

export const BACKGROUND_STYLES: { id: BackgroundStyle; name: string; desc: string }[] = [
  { id: 'default', name: 'Plain (Kawaida)', desc: 'Mandhari safi isiyo na michoro' },
  { id: 'subtle_pattern', name: 'Micro Dots (Nukta)', desc: 'Nukta ndogo za kisasa zinazovutia' },
  { id: 'solid', name: 'Solid Canvas', desc: 'Rangi moja imara isiyo na mwangaza' },
  { id: 'logo_watermark', name: 'Logo Watermark', desc: 'Alama ya EBS nyuma ya skrini' },
];

export function getThemeModeClass(mode: ThemeMode = 'dark'): string {
  if (mode === 'light') return 'theme-light bg-slate-50 text-slate-900';
  if (mode === 'oled') return 'theme-oled bg-black text-white';
  return 'theme-dark bg-slate-950 text-slate-100';
}

export function getFontSizeClass(fontSize: FontSize = 'normal'): string {
  switch (fontSize) {
    case 'small':
      return 'text-xs md:text-sm';
    case 'large':
      return 'text-base md:text-lg';
    case 'normal':
    default:
      return 'text-sm md:text-base';
  }
}

export function getBackgroundClass(bgStyle: BackgroundStyle = 'default', themeMode: ThemeMode = 'dark'): string {
  if (themeMode === 'light') {
    switch (bgStyle) {
      case 'solid':
        return 'bg-slate-100 text-slate-900';
      case 'subtle_pattern':
        return 'bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] text-slate-900';
      case 'logo_watermark':
        return 'bg-slate-100 text-slate-900';
      case 'default':
      default:
        return 'bg-slate-100 text-slate-900';
    }
  }

  if (themeMode === 'oled') {
    return 'bg-black text-white';
  }

  // Dark mode
  switch (bgStyle) {
    case 'solid':
      return 'bg-slate-950 text-slate-100';
    case 'subtle_pattern':
      return 'bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] text-slate-100';
    case 'logo_watermark':
      return 'bg-slate-950 text-slate-100';
    case 'default':
    default:
      return 'bg-slate-950 text-slate-100';
  }
}


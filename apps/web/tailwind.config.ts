import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * CDC Design System — Tailwind Configuration
 *
 * Token strategy:
 *  • semantic tokens (surface, text, brand, gold) → CSS variables → auto-switch per mode
 *  • shell tokens (sidebar, topbar chrome) → always dark, mode-aware via CSS vars
 *  • status colors (emerald, amber, red) → standard Tailwind scale, no override needed
 *  • brand = GOLD (not blue) — blue kept only as 'info' status
 */
export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Canvas: page-level background ──────────────────────────
        canvas: 'hsl(var(--canvas) / <alpha-value>)',

        // ── Surfaces: cards, panels, drawers ───────────────────────
        surface: {
          DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
          card:    'hsl(var(--surface-card) / <alpha-value>)',
          hover:   'hsl(var(--surface-hover) / <alpha-value>)',
          border:  'hsl(var(--surface-border) / <alpha-value>)',
          active:  'hsl(var(--surface-active) / <alpha-value>)',
        },

        // ── Text ────────────────────────────────────────────────────
        text: {
          primary:   'hsl(var(--text-primary) / <alpha-value>)',
          secondary: 'hsl(var(--text-secondary) / <alpha-value>)',
          muted:     'hsl(var(--text-muted) / <alpha-value>)',
          inverted:  'hsl(var(--text-inverted) / <alpha-value>)',
        },

        // ── Brand = CDC Gold ─────────────────────────────────────────
        // The primary CDC accent — replaces blue as the identity color.
        // Shade scale shifts between light/dark mode via CSS vars.
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          50:  'hsl(var(--brand-50)  / <alpha-value>)',
          100: 'hsl(var(--brand-100) / <alpha-value>)',
          200: 'hsl(var(--brand-200) / <alpha-value>)',
          300: 'hsl(var(--brand-300) / <alpha-value>)',
          400: 'hsl(var(--brand-400) / <alpha-value>)',
          500: 'hsl(var(--brand-500) / <alpha-value>)',
          600: 'hsl(var(--brand-600) / <alpha-value>)',
          700: 'hsl(var(--brand-700) / <alpha-value>)',
          800: 'hsl(var(--brand-800) / <alpha-value>)',
          900: 'hsl(var(--brand-900) / <alpha-value>)',
        },

        // ── Gold: semantic alias for brand, same values ─────────────
        gold: {
          DEFAULT: 'hsl(var(--brand)       / <alpha-value>)',
          light:   'hsl(var(--brand-300)   / <alpha-value>)',
          dark:    'hsl(var(--brand-600)   / <alpha-value>)',
        },

        // ── Shell: sidebar + topbar chrome ─────────────────────────
        // Sidebar is ALWAYS dark (both modes). Topbar adapts to mode.
        shell: {
          DEFAULT:    'hsl(var(--shell-bg)    / <alpha-value>)',
          hover:      'hsl(var(--shell-hover) / <alpha-value>)',
          border:     'hsl(var(--shell-border)/ <alpha-value>)',
          text:       'hsl(var(--shell-text)  / <alpha-value>)',
          muted:      'hsl(var(--shell-muted) / <alpha-value>)',
          'active-bg':'hsl(var(--shell-active-bg)  / <alpha-value>)',
          'active-fg':'hsl(var(--shell-active-fg)  / <alpha-value>)',
        },

        // ── Topbar surface ──────────────────────────────────────────
        topbar: {
          DEFAULT: 'hsl(var(--topbar-bg)     / <alpha-value>)',
          border:  'hsl(var(--topbar-border) / <alpha-value>)',
        },

        // ── Status (semantic aliases, always use Tailwind defaults) ─
        // These do NOT change with mode — use standard Tailwind classes
        // (emerald-*, amber-*, red-*) for status colors directly.

        // ── Info blue — used only for informational status ──────────
        info: {
          DEFAULT: '#2563eb',
          light:   '#60a5fa',
          muted:   'rgba(37,99,235,0.12)',
        },
      },

      fontFamily: {
        sans:   ['Inter', 'Tajawal', 'system-ui', 'sans-serif'],
        arabic: ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
      },

      boxShadow: {
        // Light mode: subtle elevation
        'card':    '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)',
        'card-md': '0 4px 12px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.06)',
        'card-lg': '0 8px 28px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.07)',
        // Overlay shadows
        'modal':    '0 24px 64px rgba(0,0,0,0.18)',
        'dropdown': '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.08)',
        // Shell (sidebar)
        'shell':    '1px 0 0 0 hsl(var(--shell-border))',
        // Glow (gold tint)
        'glow':     '0 0 0 3px hsl(var(--brand) / 0.22)',
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(5px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        'fade-in':         'fade-in 0.22s ease-out',
        'slide-in-right':  'slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1)',
        'slide-out-right': 'slide-out-right 0.25s ease-in',
      },
    },
  },
  plugins: [animate],
} satisfies Config;

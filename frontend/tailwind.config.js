/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          /* 500/600 were #146ef0 — 4.27:1 as text on the brand-50 (#eff6ff) chip,
             below WCAG AA. Shifted to the existing Khalsni brand-700 shade so
             blue-on-pale-blue and white-on-blue both clear 4.5:1. Same blue family. */
          500: '#0f5dd8',
          600: '#0f5dd8',
          700: '#0b49b5',
          800: '#0a3f9e',
          900: '#0b1533',
        },
        /* Semantic aliases resolve through CSS variables so a scoped theme
           (.kh-app-theme / .kh-public-theme) can retint every `bg-card`,
           `text-ink`, `border-border` surface without per-component edits.
           The :root fallbacks equal the historical light values, so the light
           system renders byte-identical. */
        background: 'var(--kh-bg, #fbfcff)',
        card: 'var(--kh-surface, #ffffff)',
        border: 'var(--kh-border, #dbe5f0)',
        accent: 'var(--kh-soft-blue, #eff6ff)',
        ink: 'var(--kh-text, #17213a)',
        success: 'var(--kh-success, #12b76a)',
        warning: 'var(--kh-warning, #f79009)',
        danger: 'var(--kh-danger, #f04438)',
      },
      fontFamily: {
        display: ['"Noto Sans Arabic"', '"IBM Plex Sans Arabic"', 'Tahoma', 'Arial', 'sans-serif'],
        body: ['"Noto Sans Arabic"', '"IBM Plex Sans Arabic"', 'Tahoma', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 22px rgba(11, 21, 51, 0.07)',
        panel: '0 1px 2px rgba(11, 21, 51, 0.05), 0 16px 40px rgba(11, 21, 51, 0.08)',
        lift: '0 18px 44px rgba(11, 21, 51, 0.12)',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '4xl': '24px',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        30: '7.5rem',
      },
      fontSize: {
        'kh-xs': ['0.75rem', { lineHeight: '1.25rem' }],
        'kh-sm': ['0.875rem', { lineHeight: '1.5rem' }],
        'kh-base': ['1rem', { lineHeight: '1.75rem' }],
        'kh-lg': ['1.125rem', { lineHeight: '1.875rem' }],
        'kh-xl': ['1.25rem', { lineHeight: '2rem' }],
        'kh-2xl': ['1.5rem', { lineHeight: '2.25rem' }],
        'kh-3xl': ['1.875rem', { lineHeight: '2.5rem' }],
        'kh-4xl': ['2.25rem', { lineHeight: '2.75rem' }],
      },
      screens: {
        xs: '390px',
      },
      transitionDuration: {
        fast: '160ms',
        polish: '220ms',
      },
    },
  },
  plugins: [],
}

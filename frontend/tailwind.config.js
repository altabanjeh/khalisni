/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe8ff',
          200: '#b8d0ff',
          300: '#86adff',
          400: '#4f82f6',
          500: '#0f55da',
          600: '#0f55da',
          700: '#093ca2',
          800: '#0b2d6b',
          900: '#021e52',
        },
        background: '#fbfcfd',
        card: '#ffffff',
        border: '#dfe3ec',
        accent: '#eef4ff',
        ink: '#162033',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
      },
      fontFamily: {
        display: ['"Noto Sans Arabic"', '"IBM Plex Sans Arabic"', 'Tahoma', 'Arial', 'sans-serif'],
        body: ['"Noto Sans Arabic"', '"IBM Plex Sans Arabic"', 'Tahoma', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 14px 42px rgba(2, 30, 82, 0.07)',
        panel: '0 1px 2px rgba(2, 30, 82, 0.06), 0 18px 48px rgba(2, 30, 82, 0.08)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

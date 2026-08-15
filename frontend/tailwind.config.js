/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#e4eeff',
          200: '#c9ddff',
          300: '#9ebeff',
          400: '#5f8fff',
          500: '#1252f7',
          600: '#1252f7',
          700: '#0e47da',
          800: '#0b3bc0',
          900: '#0b1533',
        },
        background: '#ffffff',
        card: '#ffffff',
        border: '#e4eaf2',
        accent: '#eef4ff',
        ink: '#17213a',
        success: '#12b76a',
        warning: '#f79009',
        danger: '#f04438',
      },
      fontFamily: {
        display: ['"Noto Sans Arabic"', '"IBM Plex Sans Arabic"', 'Tahoma', 'Arial', 'sans-serif'],
        body: ['"Noto Sans Arabic"', '"IBM Plex Sans Arabic"', 'Tahoma', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 28px rgba(11, 21, 51, 0.08)',
        panel: '0 1px 2px rgba(11, 21, 51, 0.06), 0 18px 48px rgba(11, 21, 51, 0.10)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

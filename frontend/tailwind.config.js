/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f9ff',
          100: '#d7e7f5',
          200: '#b8d6ef',
          300: '#8ab9e2',
          400: '#4b94d2',
          500: '#147fd1',
          600: '#0b67b2',
          700: '#0f4d86',
          800: '#0f3554',
          900: '#0b2238',
        },
        background: '#f4faff',
        card: '#ffffff',
        border: '#d7e7f5',
        accent: '#eaf6ff',
        ink: '#0f3554',
        success: '#16a34a',
        warning: '#f59e0b',
        danger: '#dc2626',
      },
      fontFamily: {
        display: ['Cairo', 'sans-serif'],
        body: ['Cairo', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15, 53, 84, 0.08)',
        panel: '0 1px 2px rgba(15, 53, 84, 0.08), 0 18px 48px rgba(15, 53, 84, 0.08)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

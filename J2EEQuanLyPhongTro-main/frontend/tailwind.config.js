/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
      },
      colors: {
        // Warm palette from login/register (TroTot brand)
        brand: {
          50:  '#FDF6ED',
          100: '#FFFAF4',
          200: '#F2C185',
          300: '#E8A880',
          400: '#D4845A', // primary
          500: '#B5673E', // primary-dark
          600: '#7D5B44',
          700: '#7D4E2D',
          800: '#3D2314',
          900: '#2C1810',
        },
        line: '#EDD8C0',
        // Dashboard palette (dashboard.html / notifications.html / rentalms.html)
        ink: {
          50:  '#F0F4F8',        // page bg
          100: '#DDE3EC',        // border
          200: '#B8C2D4',
          400: '#5A6A82',        // text-light
          700: '#1B2B4B',        // text / navbar bg
          900: '#0F1B34',
        },
        accent: {
          400: '#F08050',
          500: '#E8622A',        // dashboard primary (orange)
          600: '#C94E1A',        // primary-dark
        },
      },
      boxShadow: {
        card: '0 4px 20px rgba(61,35,20,.10)',
        'card-lg': '0 20px 60px rgba(61,35,20,.15)',
        focus: '0 0 0 3px rgba(212,132,90,.12)',
        btn: '0 6px 20px rgba(212,132,90,.35)',
      },
    },
  },
  plugins: [],
};

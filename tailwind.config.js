/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#edf6f1',
          100: '#d4ecdf',
          200: '#a9d9be',
          300: '#77be9b',
          400: '#4ea37c',
          500: '#358a63',
          600: '#27704f',
          700: '#1e5a3f',
          800: '#174830',
          900: '#113824',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

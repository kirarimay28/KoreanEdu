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
          50:  '#fff5f8',
          100: '#ffe4ef',
          200: '#ffc9e0',
          300: '#ffa3c7',
          400: '#ff70a8',
          500: '#ff4d8c',
          600: '#f02570',
          700: '#cc1858',
          800: '#a81247',
          900: '#870e3a',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

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
          50:  '#eef4f2',
          100: '#d4e8e2',
          200: '#aacfc5',
          300: '#79b3a8',
          400: '#52988c',
          500: '#3a7d73',
          600: '#2b6460',
          700: '#1f4c49',
          800: '#163836',
          900: '#0f2826',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

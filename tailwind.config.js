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
          50:  'var(--p-50)',
          100: 'var(--p-100)',
          200: 'var(--p-200)',
          300: 'var(--p-300)',
          400: 'var(--p-400)',
          500: 'var(--p-500)',
          600: 'var(--p-600)',
          700: 'var(--p-700)',
          800: 'var(--p-800)',
          900: 'var(--p-900)',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

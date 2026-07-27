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
          50:  '#fff5f9',
          100: '#feeaf3',
          200: '#fdd3e8',
          300: '#ffb3d0',
          400: '#f890bc',
          500: '#f068a0',
          600: '#de4e80',
          700: '#be3065',
          800: '#9e1e4c',
          900: '#7e0e36',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

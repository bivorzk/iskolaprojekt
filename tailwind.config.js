/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B35',
        secondary: '#FFC857',
        accent: '#FFE5DC',
        gray: '#6C757D',
      },
    },
  },
  plugins: [],
}
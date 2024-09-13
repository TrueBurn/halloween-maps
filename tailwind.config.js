/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/*.{html,js}"],
  theme: {
    fontFamily: {
      'bloody': ['Bloody','sans-serif']
    },
    extend: {
      colors: {
        'halloween-orange': '#ff6600',
        'halloween-purple': '#9333ea',
        'halloween-green': '#15803d',
        'blood-red': '#8B0000',
        'pumpkin-orange': '#FFA500',
        'ghost-white': '#F8F8FF',
        'witch-black': '#1C1C1C',
      },
    },
  },
  plugins: [],
  darkMode: 'class', // Enable dark mode
}


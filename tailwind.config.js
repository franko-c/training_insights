/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'zwift-orange': '#FF6B35',
        'power-blue': '#0066CC',
        'power-blue-light': '#4D94FF',
        'success-green': '#22C55E',
        'warning-amber': '#F59E0B',
      },
      fontFamily: {
        'mono': ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}

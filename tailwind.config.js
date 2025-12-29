/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1', // Indigo 500
          hover: '#4f46e5',   // Indigo 600
          light: '#818cf8',   // Indigo 400
          foreground: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Use Inter as default if available, or just sans
      }
    },
  },
  plugins: [],
}

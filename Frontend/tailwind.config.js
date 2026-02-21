/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#15173D',
        accent: '#982598',
        soft: '#E491C9',
      },
    },
  },
  plugins: [],
}
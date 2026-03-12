/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#5a5ad8',
        'accent-2': '#7c7cf5',
        'bg-deep': '#0d0d12',
        'bg-1': '#1a1a20',
        'bg-2': '#15151b',
        'bg-3': '#222230',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

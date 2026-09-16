/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: '#000000',
        background: '#000000',
        foreground: '#F9FAFB',
        card: '#3B0764',
        'card-foreground': '#F9FAFB',
        popover: '#3B0764',
        'popover-foreground': '#F9FAFB',
        primary: '#A855F7',
        'primary-foreground': '#F9FAFB',
        secondary: '#581C87',
        'secondary-foreground': '#F9FAFB',
        muted: '#2E1065',
        'muted-foreground': '#C4B5FD',
        accent: '#A855F7',
        'accent-foreground': '#F9FAFB',
        destructive: '#DC2626',
        border: '#2E1065',
        input: '#4C1D95',
        ring: '#A855F7',
      },
      fontFamily: {
        sans: ['Geist Variable', 'sans-serif'],
      },
      ringWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
}
/** @type {import("tailwindcss").Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#050506',
        background: '#050506',
        foreground: '#F5F1EA',
        card: '#000000',
        'card-foreground': '#F5F1EA',
        popover: '#000000',
        'popover-foreground': '#F5F1EA',
        primary: {
          DEFAULT: '#7C3AED',
          hover: '#9333EA',
          foreground: '#F5F1EA',
        },
        secondary: {
          DEFAULT: '#080A0F',
          foreground: '#A8A3AD',
        },
        cyan: {
          DEFAULT: '#22D3EE',
          foreground: '#050506',
        },
        muted: {
          DEFAULT: '#000000',
          foreground: '#6F6973',
        },
        accent: {
          DEFAULT: '#22D3EE',
          foreground: '#050506',
        },
        destructive: '#EF4444',
        success: '#22C55E',
        warning: '#F59E0B',
        border: '#1E2535',
        input: '#000000',
        ring: '#22D3EE',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      ringWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
}

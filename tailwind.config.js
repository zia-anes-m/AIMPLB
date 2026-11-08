/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        aimplb: {
          50: '#F2F7F4',
          100: '#E2EFE7',
          200: '#C5DECة',
          300: '#9ECAA0',
          400: '#6FA974',
          500: '#3F8448',
          600: '#266531',
          700: '#1B4E26',
          800: '#164734', // Institutional Deep Forest Green
          900: '#103728',
          950: '#0A251B',
          primary: '#164734',
          primaryHover: '#103728',
          charcoal: '#1A221E',
          ivory: '#FAF9F6',
          mutedGreen: '#E8F1EC',
          neutralGray: '#69756F',
          borderGray: '#E3E7E4',
          gold: '#C59A3F',
          goldLight: '#FBF6EC',
          goldDark: '#936E22',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#164734',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#E8F1EC',
          foreground: '#164734',
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F4F6F4',
          foreground: '#69756F',
        },
        accent: {
          DEFAULT: '#E8F1EC',
          foreground: '#164734',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A221E',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'card-subtle': '0 1px 2px 0 rgba(16, 24, 20, 0.03), 0 1px 3px 1px rgba(16, 24, 20, 0.02)',
        'card-hover': '0 4px 12px 0 rgba(16, 24, 20, 0.06), 0 1px 3px 0 rgba(16, 24, 20, 0.04)',
        'dropdown': '0 10px 25px -5px rgba(16, 24, 20, 0.1), 0 8px 10px -6px rgba(16, 24, 20, 0.05)',
        'modal': '0 20px 40px -10px rgba(16, 24, 20, 0.18), 0 1px 3px 0 rgba(16, 24, 20, 0.08)',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
};

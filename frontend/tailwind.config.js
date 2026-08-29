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
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
        surface: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          850: '#1d1d22',
          900: '#131318',
          925: '#0f0f13',
          950: '#09090b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '16px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        panel: '0 4px 20px -4px rgba(0, 0, 0, 0.5)',
        glow: '0 0 24px -6px rgba(250, 204, 21, 0.25)',
        'glow-lg': '0 0 48px -12px rgba(250, 204, 21, 0.35)',
        'glow-hover': '0 0 16px -4px rgba(250, 204, 21, 0.18)',
        'card-hover': '0 8px 32px -8px rgba(0, 0, 0, 0.6)',
        highlight: '0 0 0 1px rgba(250, 204, 21, 0.25)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-cubic': 'cubic-bezier(0.33, 1, 0.68, 1)',
        'snappy': 'cubic-bezier(0.3, 0.4, 0.2, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '70%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'grow-soft': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'draw-down': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        'check-pop': {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'pop-in': 'pop-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up': 'fade-up 0.4s cubic-bezier(0.33, 1, 0.68, 1) both',
        'grow-soft': 'grow-soft 0.6s cubic-bezier(0.33, 1, 0.68, 1) both',
        'fade-in': 'fade-in 0.5s cubic-bezier(0.33, 1, 0.68, 1) both',
        'draw-down': 'draw-down 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'check-pop': 'check-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      backgroundImage: {
        'app-ambient': 'radial-gradient(1100px 600px at 15% -10%, rgba(250, 204, 21, 0.05), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(99, 102, 241, 0.05), transparent 55%)',
      },
    },
  },
  plugins: [],
}
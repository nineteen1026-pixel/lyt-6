/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        stone: {
          50:  'var(--color-stone-50,  #FEFAF5)',
          100: 'var(--color-stone-100, #F5EFE0)',
          200: 'var(--color-stone-200, #E8DCC0)',
          300: 'var(--color-stone-300, #D4C4A0)',
          400: 'var(--color-stone-400, #A8A29E)',
          500: 'var(--color-stone-500, #9C8E7C)',
          600: 'var(--color-stone-600, #6B5D4F)',
          700: 'var(--color-stone-700, #57534E)',
          800: 'var(--color-stone-800, #3D2914)',
          900: 'var(--color-stone-900, #291810)',
          950: 'var(--color-stone-950, #1C1008)',
        },
        amber: {
          50:  'var(--color-amber-50,  #FFFBEB)',
          100: 'var(--color-amber-100, #FEF3C7)',
          200: 'var(--color-amber-200, #FDE68A)',
          300: 'var(--color-amber-300, #FCD34D)',
          400: 'var(--color-amber-400, #FBBF24)',
          500: 'var(--color-amber-500, #D4AF37)',
          600: 'var(--color-amber-600, #8B6914)',
          700: 'var(--color-amber-700, #6B4F10)',
          800: 'var(--color-amber-800, #5C3D0C)',
          900: 'var(--color-amber-900, #4A3008)',
          950: 'var(--color-amber-950, #2A1A04)',
        },
        gray: {
          50:  'var(--color-gray-50,  #FDFBF7)',
          100: 'var(--color-gray-100, #F7F1E4)',
          200: 'var(--color-gray-200, #EDE5D1)',
          300: 'var(--color-gray-300, #D9CFAE)',
          400: 'var(--color-gray-400, #B5A98C)',
          500: 'var(--color-gray-500, #9C8E7C)',
          600: 'var(--color-gray-600, #7A6F5A)',
          700: 'var(--color-gray-700, #5E5445)',
          800: 'var(--color-gray-800, #443C30)',
          900: 'var(--color-gray-900, #2A241A)',
        },
        orange: {
          50:  'var(--color-orange-50,  #FFF7ED)',
          100: 'var(--color-orange-100, #FFEDD5)',
          200: 'var(--color-orange-200, #FED7AA)',
          300: 'var(--color-orange-300, #FDBA74)',
        },
        primary: {
          DEFAULT: 'var(--color-primary, #8B6914)',
          light: 'var(--color-primary-light, #D4AF37)',
          dark: 'var(--color-primary-dark, #5C4A1C)',
        },
        warm: {
          50: 'var(--color-bg-card, #FAF5E8)',
          100: 'var(--color-bg, #F5EFE0)',
          200: 'var(--color-bg-alt, #EDE4CC)',
        },
        ink: {
          DEFAULT: 'var(--color-text, #3D2914)',
          light: 'var(--color-text-light, #6B5D4F)',
          muted: 'var(--color-text-muted, #9C8E7C)',
        },
        accent: {
          gold: 'var(--color-gold, #D4AF37)',
          green: 'var(--color-green, #6B8E6B)',
          rose: 'var(--color-rose, #C97B6B)',
        },
      },
      fontFamily: {
        display: ['ZCOOL XiaoWei', 'Noto Serif SC', 'Georgia', 'serif'],
        serif: ['Noto Serif SC', 'Georgia', 'serif'],
      },
      animation: {
        'float-gentle': 'float-gentle 4s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out both',
        'scale-in': 'scale-in 0.3s ease-out both',
      },
      keyframes: {
        'float-gentle': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'fade-in-up': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          'from': { opacity: '0', transform: 'scale(0.92)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

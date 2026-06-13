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
        primary: {
          DEFAULT: '#8B6914',
          light: '#D4AF37',
          dark: '#5C4A1C',
        },
        warm: {
          50: '#FAF5E8',
          100: '#F5EFE0',
          200: '#E8DCC0',
          300: '#D4C4A0',
        },
        ink: {
          DEFAULT: '#3D2914',
          light: '#6B5D4F',
          muted: '#9C8E7C',
        },
        accent: {
          gold: '#D4AF37',
          green: '#6B8E6B',
          rose: '#C97B6B',
        }
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

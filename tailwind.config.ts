import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B56A1',
          dark:    '#0D2D5E',
          foreground: '#FFFFFF',
        },
        gold: {
          DEFAULT: '#E8B92F',
          foreground: '#0D2D5E',
        },
        green: {
          DEFAULT: '#A7CB61',
          foreground: '#0D2D5E',
        },
        stone: {
          DEFAULT: '#2C2C2C',
          light:   '#6B7280',
        },
        bg: {
          DEFAULT: '#F8FAFF',
          white:   '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['var(--font-montserrat)', 'Montserrat', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;

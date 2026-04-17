import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0b0f',
          secondary: '#12141a',
          tertiary: '#1a1d2e',
        },
        border: {
          DEFAULT: '#1e2130',
          active: '#2d3250',
        },
        accent: {
          DEFAULT: '#5865f2',
          hover: '#4752c4',
          glow: 'rgba(88,101,242,0.15)',
        },
        text: {
          primary: '#e8eaf0',
          secondary: '#9ba3b8',
          muted: '#4b5263',
        },
        suggestion: {
          question: '#3b82f6',
          insight: '#10b981',
          'fact-check': '#f59e0b',
          'talking-point': '#8b5cf6',
          answer: '#ec4899',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

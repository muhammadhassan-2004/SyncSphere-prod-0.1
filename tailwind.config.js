/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        'text-primary': 'hsl(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'hsl(var(--text-secondary) / <alpha-value>)',
        'accent-cyan': 'hsl(var(--accent-cyan) / <alpha-value>)',
        'accent-green': 'hsl(var(--accent-green) / <alpha-value>)',
        'info-blue': 'hsl(var(--info-blue) / <alpha-value>)',
        'success-green': 'hsl(var(--success-green) / <alpha-value>)',
        'warning-amber': 'hsl(var(--warning-amber) / <alpha-value>)',
        'review-purple': 'hsl(var(--review-purple) / <alpha-value>)',
        'danger-red': 'hsl(var(--danger-red) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        h1: ['30px', { lineHeight: '1.25', fontWeight: '700' }],
        h2: ['19px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['12.5px', { lineHeight: '1.4', fontWeight: '400' }],
        stat: ['32px', { lineHeight: '1.2', fontWeight: '700' }],
      },
      borderRadius: {
        global: '10px',
        card: '10px',
        button: '10px',
        input: '10px',
        badge: '9999px',
      },
      spacing: {
        '4px': '4px',
        '8px': '8px',
        '12px': '12px',
        '16px': '16px',
        '24px': '24px',
        '32px': '32px',
        '48px': '48px',
        'sp-4': '4px',
        'sp-8': '8px',
        'sp-12': '12px',
        'sp-16': '16px',
        'sp-24': '24px',
        'sp-32': '32px',
        'sp-48': '48px',
      },
      backgroundImage: {
        'accent-gradient': 'var(--accent-gradient)',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
};

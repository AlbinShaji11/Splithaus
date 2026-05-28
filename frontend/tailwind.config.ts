import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F9F7F3',
          '2':     '#EDEAE3',
        },
        card: {
          DEFAULT: '#FFFFFF',
          '2':     '#F9F7F3',
        },
        ink: {
          DEFAULT: '#1C1B18',
          '2':     '#6A6470',
          '3':     '#9A948E',
        },
        accent: {
          DEFAULT: '#4F46E5', // indigo — primary actions
          dark:    '#4338CA',
        },
        disc: {
          DEFAULT: '#C84B31', // terracotta — discounts only
          dark:    '#A83D25',
        },
        rule: {
          DEFAULT: '#E9E3D6',
          strong:  '#D8D0BF',
        },
      },
      fontFamily: {
        sans:    ['"Inter"',         'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono:    ['"DM Mono"',       'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        display: '-0.035em',
        heading: '-0.025em',
        tight:   '-0.01em',
        wide:    '0.10em',
        wider:   '0.14em',
      },
      borderRadius: {
        xs:  '6px',
        sm:  '10px',
        md:  '14px',
        lg:  '20px',
        xl:  '28px',
        '2xl': '32px',
      },
      boxShadow: {
        sm:   '0 1px 2px rgba(30,25,20,0.05)',
        md:   '0 10px 28px rgba(30,25,20,0.08), 0 2px 6px rgba(30,25,20,0.04)',
        lg:   '0 30px 72px rgba(30,25,20,0.14), 0 6px 16px rgba(30,25,20,0.06)',
        card: '0 1px 3px rgba(30,25,20,0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config

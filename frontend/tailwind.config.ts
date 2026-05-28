import type { Config } from 'tailwindcss'

// SplitHaus design tokens (cream + indigo theme).
// Primary indigo is defined as a CSS variable (oklch) in index.css — use
// arbitrary-value syntax [var(--primary)] in classes for it.
// Hex tokens below cover everything that doesn't need oklch precision.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FAF7F1', // cream page background
          '2':     '#F3EFE6', // slightly darker strip
        },
        card: {
          DEFAULT: '#FFFFFF',
          '2':     '#FAF7F1',
        },
        ink: {
          DEFAULT: '#1A1820', // deep warm-black body text  (contrast 18:1 on paper)
          '2':     '#6A6470', // muted / secondary text     (contrast 5.5:1)
          '3':     '#9A948E', // dim / micro labels         (contrast 3.2:1 ≥14px)
        },
        accent: {
          DEFAULT: '#C84B31', // terracotta CTA accent (user-specified token)
          dark:    '#A83D25',
        },
        rule: {
          DEFAULT: '#E9E3D6', // hairline borders
          strong:  '#D8D0BF', // stronger control outlines
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

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'hyve-sm': 'var(--r-sm)',
        'hyve-md': 'var(--r-md)',
        'hyve-lg': 'var(--r-lg)',
        'hyve-full': 'var(--r-full)',
      },
      boxShadow: {
        'hyve-sm': 'var(--shadow-sm)',
        'hyve-md': 'var(--shadow-md)',
        'hyve-lg': 'var(--shadow-lg)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          accent: 'hsl(var(--sidebar-accent))',
          border: 'hsl(var(--sidebar-border))',
        },
        honey: {
          DEFAULT: 'var(--honey)',
          dark: 'var(--honey-dark)',
          light: 'var(--honey-light)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
        },
        paper: {
          DEFAULT: 'var(--paper)',
          alt: 'var(--paper-alt)',
        },
        neutral: {
          50: 'var(--n-50)',
          100: 'var(--n-100)',
          200: 'var(--n-200)',
          300: 'var(--n-300)',
          400: 'var(--n-400)',
          500: 'var(--n-500)',
          600: 'var(--n-600)',
          700: 'var(--n-700)',
          800: 'var(--n-800)',
        },
        status: {
          draft: 'var(--s-draft)',
          pending: 'var(--s-pending)',
          approved: 'var(--s-approved)',
          changes: 'var(--s-changes)',
          scheduled: 'var(--s-scheduled)',
          published: 'var(--s-published)',
        },
        platform: {
          fb: 'var(--fb)',
        },
      },
      keyframes: {
        'progress-indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        'progress-indeterminate': 'progress-indeterminate 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

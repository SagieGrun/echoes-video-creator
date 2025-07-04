/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy colors (keeping for dashboard compatibility)
        primary: {
          50: '#fef7ee',
          100: '#fdedd3',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          900: '#9a3412',
        },
        coral: {
          100: '#fdf2f2',
          200: '#fce8e8',
          300: '#f8d4d4',
          400: '#f2b5b5',
          500: '#e89999',
          600: '#d97777',
          700: '#c55555',
          800: '#a44444',
          900: '#7a3333',
        },
        // New design system colors
        'clean-white': '#fafafa',
        'soft-gray': '#f5f5f5',
        'light-gray': '#f8f8f8',
        'deep-charcoal': '#1a1a1a',
        'medium-charcoal': '#2c2c2c',
        'subtle-gray': '#666666',
        'light-border': '#cccccc',
        'accent-coral': '#ff6b6b',
        'accent-teal': '#4ecdc4',
      },
    },
  },
  plugins: [],
} 
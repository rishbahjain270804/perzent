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
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a', // Primary Green
          700: '#15803d', // Hover / Dark Green
          800: '#166534',
          900: '#14532d',
          primary: '#16a34a',
          hover: '#15803d',
          dark: '#15803d',
        },
        ink: {
          primary: '#111827', // Primary text: almost black
          secondary: '#6b7280', // Secondary text
        },
      },
    },
  },
  plugins: [],
};

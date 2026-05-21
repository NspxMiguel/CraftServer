/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Lava orange — furnace/crafting feel, nothing like LootFlow
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Warm dark — cave/underground feel
        dark: {
          950: '#080807',
          900: '#100f0c',
          800: '#1a1916',
          750: '#1f1e1a',
          700: '#252320',
          600: '#302e29',
          500: '#3d3a34',
          400: '#4b4841',
          300: '#5a564f',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      // Reduzir arredondamentos — menos "AI mobile app", mais "desktop tool"
      borderRadius: {
        'none': '0',
        'sm':   '2px',
        DEFAULT: '3px',
        'md':   '4px',
        'lg':   '6px',
        'xl':   '8px',
        '2xl':  '10px',
        '3xl':  '14px',
        'full': '9999px',
      },
      backgroundImage: {
        'grid-dark': 'linear-gradient(rgba(251,146,60,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.035) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '48px 48px',
      },
    },
  },
  plugins: [],
}

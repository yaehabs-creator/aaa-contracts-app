/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aaa: {
          blue: '#1e3a8a',
          hover: '#172554',
          bg: '#F8FAFC',
          border: 'rgba(30,58,138,0.1)',
          text: '#1e3a8a',
          muted: '#64748b',
          accent: '#2563eb'
        },
        mac: {
          blue: '#1e3a8a',
          'blue-hover': '#172554',
          'blue-light': '#60a5fa',
          'blue-subtle': '#dbeafe',
          navy: '#172554',
          charcoal: '#0f172a',
          muted: '#64748b',
          'muted-light': '#94a3b8'
        },
        surface: {
          bg: '#F8FAFC',
          'bg-subtle': '#F1F5F9',
          card: '#FFFFFF',
          border: 'rgba(30, 58, 138, 0.1)',
          'border-hover': 'rgba(30, 58, 138, 0.2)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace']
      },
      borderRadius: {
        'aaa': '12px',
        'mac': '16px',
        'mac-lg': '20px',
        'mac-sm': '12px',
        'mac-xs': '8px'
      },
      boxShadow: {
        'premium': '0 4px 24px -4px rgba(30, 58, 138, 0.08), 0 0 0 1px rgba(30, 58, 138, 0.03)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(30, 58, 138, 0.03)',
        'mac': '0 4px 24px -4px rgba(30, 58, 138, 0.08), 0 0 0 1px rgba(30, 58, 138, 0.03)',
        'mac-hover': '0 8px 32px -4px rgba(30, 58, 138, 0.12), 0 0 0 1px rgba(30, 58, 138, 0.04)',
        'mac-sm': '0 2px 8px -2px rgba(30, 58, 138, 0.06), 0 0 0 1px rgba(30, 58, 138, 0.02)',
        'mac-focus': '0 0 0 3px rgba(30, 58, 138, 0.15)',
        'mac-inset': 'inset 0 1px 2px rgba(0,0,0,0.04)'
      },
    },
  },
  plugins: [],
}

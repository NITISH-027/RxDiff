/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        chrome: 'var(--chrome)',
        panel: 'var(--panel)',
        'panel-raised': 'var(--panel-raised)',
        recessed: 'var(--recessed)',
        paper: 'var(--paper)',
        'paper-edge': 'var(--paper-edge)',
        'paper-ink': 'var(--paper-ink)',
        'paper-muted': 'var(--paper-muted)',
        'line-dark': 'var(--line-dark)',
        'line-active': 'var(--line-active)',
        'line-paper': 'var(--line-paper)',
        'text-1': 'var(--text)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        active: 'var(--active)',
        matched: 'var(--matched)',
        changed: 'var(--changed)',
        stopped: 'var(--stopped)',
        duplicate: 'var(--duplicate)',
        uncertain: 'var(--uncertain)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      },
    },
  },
  plugins: [],
}

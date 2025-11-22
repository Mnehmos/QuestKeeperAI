/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          black: '#0a0a0a',
          dim: '#1a1a1a',
          green: {
            DEFAULT: '#00ff41',
            dim: '#003300',
          },
          amber: '#ffb000',
          cyan: '#00f0ff',
        },
      },
      fontFamily: {
        mono: ['"Fira Code"', '"Courier New"', 'monospace'],
      },
    },
  },
  plugins: [],
}

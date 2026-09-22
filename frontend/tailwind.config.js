/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0ea472', dark: '#0b8a5f', light: '#e6f7f2' },
        danger:  { DEFAULT: '#ef4444', light: '#fee2e2' },
        warn:    { DEFAULT: '#f59e0b', light: '#fef3c7' },
        info:    { DEFAULT: '#3b82f6', light: '#dbeafe' },
        surface: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  },
  plugins: []
}

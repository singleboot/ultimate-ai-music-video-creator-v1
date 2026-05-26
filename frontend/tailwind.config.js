/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arcane: {
          bg: '#05010d',
          secondary: '#0b0417',
          purple: '#b026ff',
          pink: '#ff3bd4',
          blue: '#63d4ff',
          text: '#ffffff',
          muted: '#b9b4d0',
          card: 'rgba(11, 4, 23, 0.6)',
          border: 'rgba(176, 38, 255, 0.3)',
        },
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-purple': '0 0 15px rgba(176, 38, 255, 0.5), 0 0 45px rgba(176, 38, 255, 0.2)',
        'neon-pink': '0 0 15px rgba(255, 59, 212, 0.5), 0 0 45px rgba(255, 59, 212, 0.2)',
        'neon-blue': '0 0 15px rgba(99, 212, 255, 0.5), 0 0 45px rgba(99, 212, 255, 0.2)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'glow-spin': 'glow-spin 4s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'drift': 'drift 8s ease-in-out infinite',
        'fadeInUp': 'fadeInUp 0.6s ease-out',
        'slideInRight': 'slideInRight 0.5s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(176,38,255,0.4), 0 0 60px rgba(176,38,255,0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(176,38,255,0.8), 0 0 80px rgba(176,38,255,0.3)' },
        },
        'glow-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'drift': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(10px, -10px)' },
          '50%': { transform: 'translate(-5px, -15px)' },
          '75%': { transform: 'translate(-10px, 5px)' },
        },
        'fadeInUp': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slideInRight': {
          '0%': { opacity: '0', transform: 'translateX(50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backdropBlur: {
        'glass': '20px',
      },
    },
  },
  plugins: [],
}

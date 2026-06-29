/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                saffron: {
                    50: '#fff9f0',
                    100: '#ffedd5',
                    200: '#ffd6a6',
                    300: '#ffb56b',
                    400: '#ff8c2b',
                    500: '#ff6b00', // Deep vibrant pure Saffron (Marigold/Orange mix)
                    600: '#e65200',
                    700: '#bf3b00',
                    800: '#992e00',
                    900: '#7a2704',
                    950: '#421100',
                },
                royal: {
                    50: '#f6f6f9',
                    100: '#ebebf1',
                    200: '#d3d4e0',
                    300: '#aeb1c6',
                    400: '#8388a7',
                    500: '#62688b',
                    600: '#4d5171',
                    700: '#3f425b',
                    800: '#35374a',
                    900: '#2c2e3d',
                    950: '#1b1c26' // Premium deep slate/royal background
                }
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'sans-serif'],
                outfit: ['var(--font-outfit)', 'sans-serif'],
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-in-from-top-5': {
                    '0%': { transform: 'translateY(-20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'slide-in-from-right-4': {
                    '0%': { transform: 'translateX(16px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                'slide-in-up': {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'zoom-in-95': {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                'gradient-x': {
                    '0%, 100%': {
                        'background-position': '0% 50%'
                    },
                    '50%': {
                        'background-position': '100% 50%'
                    },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            },
            animation: {
                'gradient-x': 'gradient-x 15s ease infinite',
                'fade-in': 'fade-in 0.4s ease-out',
                'slide-up': 'slide-in-up 0.5s ease-out',
                'float': 'float 6s ease-in-out infinite',
            },
        },
    },
    plugins: [],
}

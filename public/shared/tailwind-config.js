// Shared Tailwind configuration — included in every page that uses Tailwind CDN.
// Must be placed after the tailwindcss CDN <script> tag and before the body.
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary:   '#FF6B35',
                secondary: '#FFC857',
                accent:    '#FFE5DC',
                gray:      '#6C757D',
            },
            keyframes: {
                pulse2: {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%':      { opacity: '0.85', transform: 'scale(0.97)' },
                },
            },
            animation: {
                pulse2: 'pulse2 2s ease-in-out infinite',
            },
        },
    },
};

module.exports = { darkMode: 'class', content: ['./src/**/*.{ts,tsx}'], presets: [require('nativewind/preset')], corePlugins: { preflight: false }, theme: { extend: { colors: { foreground: '#1C1C1E', accent: '#E9E9EE', 'accent-foreground': '#1C1C1E', muted: '#E9E9EE', 'muted-foreground': '#606067', input: '#DCDCE2', ring: '#2E7D3C' } } }, plugins: [] };


// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    'autoprefixer': {},
    'postcss-px-to-viewport-8-plugin': {
      viewportWidth: 375,
      unitPrecision: 3,
      viewportUnit: 'vw',
      selectorBlackList: ['.ignore', '.hairlines'],
      minPixelValue: 1,
      mediaQuery: false,
      exclude: [/node_modules/],
    },
  },
}
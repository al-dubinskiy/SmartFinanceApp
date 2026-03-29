module.exports = {
  presets: [
    'module:@react-native/babel-preset'
    // [
    //   'module:metro-react-native-babel-preset',
    //   // {
    //   //   useTransformReactJSXExperimental: true, // Включаем новую JSX трансформацию
    //   //   disableTransformReactJSX: false,
    //   // },
    // ],
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    // '@babel/plugin-transform-flow-strip-types',
    'react-native-reanimated/plugin',
    // 'react-native-worklets/plugin'
  ],
};

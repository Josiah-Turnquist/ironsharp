module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Worklets plugin must be listed last. Reanimated 4 moved the worklet
      // Babel transform here from the old react-native-reanimated/plugin; using
      // the old path silently shipped un-workletized code (a launch crash).
      "react-native-worklets/plugin",
    ],
  };
};

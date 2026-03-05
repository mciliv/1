const path = require("path");

module.exports = {
  rootDir: path.join(__dirname, ".."),
  testEnvironment: "node",
  transform: {
    "^.+\.(js|jsx)$": ["babel-jest", { 
      presets: [
        ["@babel/preset-env", { targets: { node: "current" } }],
        ["@babel/preset-react", { runtime: "automatic" }]
      ],
      plugins: ["@babel/plugin-transform-modules-commonjs"]
    }]
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css)$": "<rootDir>/tests/__mocks__/styleMock.js"
  },
  moduleFileExtensions: ["js", "jsx", "json"],
  globals: {
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 30000,
  verbose: false,
  silent: true
};

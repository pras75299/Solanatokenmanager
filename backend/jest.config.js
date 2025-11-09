module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/test/setupEnv.js"],
  testMatch: ["**/__tests__/**/*.test.js"],
  clearMocks: true,
  resetModules: true,
};

// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  _comment:
    "This config was generated using 'stryker init'. Please see the guide at https://stryker-mutator.io/docs/stryker-js/configuration/ for more information.",
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "jest",
  coverageAnalysis: "perTest",
  jest: {
    projectType: "custom",
    configFile: "jest.config.js",
    enableFindRelatedTests: true,
  },
  incremental: true,
  incrementalFile: "stryker-incremental.json",
  mutate: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/tulweb.js" // Entry point is often mostly boilerplate/exports
  ],
  concurrency: 2, // Low for local run, can be adjusted for CI
};

export default config;

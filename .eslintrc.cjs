module.exports = {
  root: true,
  extends: ['standard'],
  env: {
    browser: true,
    es2022: true,
    jest: true,
  },
  parserOptions: {
    sourceType: 'module',
  },
  plugins: ['import'],
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src/utils',
            from: './src/managers',
            message: 'Utils should not depend on Managers.',
          },
          {
            target: './src/utils',
            from: './src/ui',
            message: 'Utils should not depend on UI.',
          },
          {
            target: './src/core',
            from: './src/managers',
            message: 'Core items should not depend on Managers.',
          },
        ],
      },
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/index.js'],
            message: 'Avoid barrel files to improve tree-shaking and test speed.',
          },
        ],
      },
    ],
  },
};

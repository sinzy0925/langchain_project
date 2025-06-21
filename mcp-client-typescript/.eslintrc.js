module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'prettier'],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'prettier',
    ],
    rules: {
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn', // anyの使用は警告に留める (徐々に型付け)
      '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    },
    env: {
      node: true,
      es2021: true,
    },
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    ignorePatterns: ["dist/", "node_modules/"],
  };
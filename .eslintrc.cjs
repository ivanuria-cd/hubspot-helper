module.exports = {
  root: true,
  env: { browser: true, node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    // TS ya valida las props; prop-types es redundante en un proyecto TypeScript.
    'react/prop-types': 'off',
    // Convención del proyecto: el prefijo `_` marca parámetros/variables deliberadamente sin uso.
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  // Informe 2026-07-02 §11.3: ignora también artefactos y código no productivo.
  // Migración a flat config / ESLint 9 pendiente (ESLint 8 + .eslintrc está EOL).
  ignorePatterns: [
    'out',
    'dist',
    'build',
    'node_modules',
    'sandbox',
    'coverage',
    'test-results',
    'playwright-report',
    'doc',
    '*.config.ts',
  ],
};

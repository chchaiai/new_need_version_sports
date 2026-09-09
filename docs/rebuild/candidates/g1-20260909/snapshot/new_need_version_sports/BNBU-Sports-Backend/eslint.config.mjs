import parser from '@typescript-eslint/parser';
export default [
  { ignores: ['src/shared/api/contract.generated.ts', 'node_modules/**', 'evidence/**'] },
  { files: ['**/*.ts', '**/*.mjs'], languageOptions: { parser, ecmaVersion: 'latest', sourceType: 'module' },
    rules: { 'no-debugger': 'error', 'no-eval': 'error', 'no-implied-eval': 'error',
      'no-duplicate-imports': 'error', 'no-constant-condition': 'error', 'eqeqeq': 'error',
      'no-throw-literal': 'error', 'no-unreachable': 'error' } }
];

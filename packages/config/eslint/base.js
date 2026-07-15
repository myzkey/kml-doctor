import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export const createKmlDoctorEslintConfig = ({ tsconfigRootDir } = {}) =>
  tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    prettier,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
      },
    },
    {
      ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'package-lock.json'],
    },
  );

export default createKmlDoctorEslintConfig;

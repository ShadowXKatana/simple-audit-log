import nextConfig from 'eslint-config-next'
import tseslint from 'typescript-eslint'

export default tseslint.config(...nextConfig, ...tseslint.configs.recommended, {
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
})

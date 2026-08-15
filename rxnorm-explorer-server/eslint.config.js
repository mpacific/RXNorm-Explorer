import js from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  js.configs.recommended,
  // Must be the absolute last item in the array
  eslintPluginPrettierRecommended,
];

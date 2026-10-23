import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/database.types.ts',
      '**/.turbo/**',
      '**/coverage/**',
      'tooling/fixtures/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'never',
        },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': true,
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
    },
  },
  // Installed shadcn components in packages/ui
  {
    files: ['packages/ui/src/components/**'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },
  // React Hooks
  {
    files: ['**/*.{tsx,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  // Storefront Next.js plugin
  {
    files: ['apps/storefront/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  // CSS walls outside packages/ui (one entry)
  {
    files: [
      'apps/**/*.{ts,tsx,js,jsx}',
      'packages/core/**/*.{ts,tsx}',
      'packages/data/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXAttribute[name.name='style']:not([value.expression.callee.name='cssVars']), JSXAttribute[name.name='className'] Literal[value=/(\\w-\\[|#[0-9a-fA-F]{3,8})/], JSXAttribute[name.name='className'] TemplateElement[value.raw=/(\\w-\\[|#[0-9a-fA-F]{3,8})/], CallExpression[callee.name=/^(cn|cva)$/] Literal[value=/(\\w-\\[|#[0-9a-fA-F]{3,8})/], CallExpression[callee.name=/^(cn|cva)$/] TemplateElement[value.raw=/(\\w-\\[|#[0-9a-fA-F]{3,8})/]",
          message:
            'CSS wall: token classes only. No arbitrary values (\\w-[), no hex colors, and no JSX style attribute unless its value is a cssVars(...) call.',
        },
      ],
    },
  },
  // Import walls for apps/dashboard
  {
    files: ['apps/dashboard/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@smartapp/storefront*', '@smartapp/api*', '**/storefront/**', '**/api/**'],
              message: 'Import wall: apps may never import each other.',
            },
            {
              group: ['@supabase/*', '@supabase/**'],
              message: 'Import wall: only packages/data and apps/api may import @supabase/*.',
            },
          ],
        },
      ],
    },
  },
  // Import walls for apps/storefront
  {
    files: ['apps/storefront/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@smartapp/dashboard*', '@smartapp/api*', '**/dashboard/**', '**/api/**'],
              message: 'Import wall: apps may never import each other.',
            },
            {
              group: ['@supabase/*', '@supabase/**'],
              message: 'Import wall: only packages/data and apps/api may import @supabase/*.',
            },
          ],
        },
      ],
    },
  },
  // Import walls for apps/api
  {
    files: ['apps/api/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@smartapp/dashboard*',
                '@smartapp/storefront*',
                '**/dashboard/**',
                '**/storefront/**',
              ],
              message: 'Import wall: apps may never import each other.',
            },
          ],
        },
      ],
    },
  },
  // Import wall: packages/core may not import React or Supabase, nor @smartapp/ui, nor @smartapp/data
  {
    files: ['packages/core/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Import wall: packages/core may not import React.',
            },
            {
              name: 'react-dom',
              message: 'Import wall: packages/core may not import React.',
            },
          ],
          patterns: [
            {
              group: [
                'react/*',
                'react-dom/*',
                '@types/react*',
                '@supabase/*',
                '@smartapp/ui*',
                '@smartapp/data*',
              ],
              message:
                'Import wall: packages/core may not import React, Supabase, @smartapp/ui, or @smartapp/data.',
            },
          ],
        },
      ],
    },
  },
  // Import wall: packages/ui may not import @smartapp/data or @supabase/*
  {
    files: ['packages/ui/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@smartapp/data*'],
              message: 'Import wall: packages/ui may not import @smartapp/data.',
            },
            {
              group: ['@supabase/*', '@supabase/**'],
              message: 'Import wall: only packages/data and apps/api may import @supabase/*.',
            },
          ],
        },
      ],
    },
  },
  // Import wall: files in apps/dashboard/src/features/<a> may not import features/<b>
  {
    files: ['apps/dashboard/src/features/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@smartapp/storefront*', '@smartapp/api*', '**/storefront/**', '**/api/**'],
              message: 'Import wall: apps may never import each other.',
            },
            {
              group: ['@supabase/*', '@supabase/**'],
              message: 'Import wall: only packages/data and apps/api may import @supabase/*.',
            },
            {
              group: ['@/features/**', '**/features/**', '../*/**'],
              message:
                'Import wall: dashboard features may not cross-import. Shared code goes in apps/dashboard/src/app/.',
            },
          ],
        },
      ],
    },
  },
);

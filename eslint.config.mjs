import vue from 'eslint-plugin-vue'
import unusedImports from 'eslint-plugin-unused-imports'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**'
    ]
  },
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{js,jsx,mjs,cjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      'unused-imports': unusedImports
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off'
    }
  },
  prettierConfig,
  {
    files: ['**/*.{js,jsx,mjs,cjs,vue}'],
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'never'],
      semi: ['error', 'never'],
      'space-before-function-paren': ['error', 'always'],
      'func-call-spacing': ['error', 'never'],
      'no-case-declarations': 'off'
    }
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/no-reserved-component-names': 'error',
      'vue/component-name-in-template-casing': [
        'error',
        'kebab-case',
        {
          registeredComponentsOnly: false
        }
      ],
      'vue/first-attribute-linebreak': [
        'error',
        {
          singleline: 'ignore',
          multiline: 'below'
        }
      ],
      'vue/max-attributes-per-line': [
        'error',
        {
          singleline: {
            max: 3
          },
          multiline: {
            max: 1
          }
        }
      ],
      'vue/html-closing-bracket-newline': [
        'error',
        {
          singleline: 'never',
          multiline: 'always'
        }
      ],
      'vue/html-indent': [
        'error',
        2,
        {
          attribute: 1,
          baseIndent: 1,
          closeBracket: 0,
          alignAttributesVertically: false
        }
      ]
    }
  }
]

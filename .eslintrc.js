module.exports = {
  env: {
    browser: true,
    es2022: true,
    webextensions: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Possible Errors
    'no-console': 'off',
    'no-debugger': 'warn',
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    'no-redeclare': 'error',
    
    // Allow chrome global in extensions
    'no-undef': 'off',
    
    // Best Practices
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implicit-globals': 'off',
    
    // Style
    'indent': ['error', 2, { SwitchCase: 1 }],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'max-len': ['warn', { code: 120 }],
    'object-shorthand': ['warn', 'always'],
    'arrow-body-style': ['warn', 'as-needed']
  },
  overrides: [
    {
      files: ['**/*.worker.js', '**/*.worklet.js'],
      env: {
        worker: true
      },
      rules: {
        'no-unused-vars': ['warn', { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_' 
        }]
      }
    },
    {
      files: ['**/test*.js', '**/*.test.js'],
      env: {
        mocha: true,
        node: true
      },
      rules: {
        'no-unused-expressions': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.min.js'
  ]
};

module.exports = {
    'env': {
        'browser': true,
        'commonjs': true,
        'es6': true,
    },
    'extends': [
        'google',
    ],
    'parser': '@babel/eslint-parser',
    'parserOptions': {
        'sourceType': 'module',
        'ecmaVersion': 12,
    },
    'rules': {
        'indent': ['error', 4],
        'max-len': ['error', {
            code: 120,
            tabWidth: 4,
            ignoreUrls: true,
        }],
    },
};

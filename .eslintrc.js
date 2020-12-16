module.exports = {
    'env': {
        'browser': true,
        'commonjs': true,
        'es2021': true,
    },
    'extends': [
        'google',
    ],
    'parserOptions': {
        'ecmaVersion': 12,
    },
    'rules': {
        'indent': ['error', 4],
        'max-len': ['error', {
            code: 100,
            tabWidth: 4,
            ignoreUrls: true,
        }],
    },
};

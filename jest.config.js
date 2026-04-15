export default {
    testEnvironment: 'jsdom',
    testMatch: ['**/src/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/tulweb.js'
    ],
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
    },
};

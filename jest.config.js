export default {
    testEnvironment: 'jsdom',
    testMatch: ['**/tests/unit/**/*.test.js'],
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
    },
};

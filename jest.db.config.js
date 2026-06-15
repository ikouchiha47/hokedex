module.exports = {
  displayName: 'db',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/db/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.sql$': '<rootDir>/jest-transform-sql.js',
    '^.+\\.(ts|tsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '@op-engineering/op-sqlite': '<rootDir>/src/db/__tests__/helpers/op-sqlite-mock.ts',
  },
};

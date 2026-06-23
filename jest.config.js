module.exports = {
  projects: [
    // DB workflow tests — pure Node, real SQLite via better-sqlite3 adapter
    {
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
    },
    // Pure TS unit tests (services + procedural helpers, no RN deps)
    {
      displayName: 'services',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/services/__tests__/**/*.test.ts',
        '<rootDir>/src/components/weather/scene/__tests__/**/*.test.ts',
      ],
      transform: {
        '^.+\\.sql$': '<rootDir>/jest-transform-sql.js',
        '^.+\\.(ts|tsx)$': 'babel-jest',
      },
      moduleNameMapper: {
        '@op-engineering/op-sqlite': '<rootDir>/src/db/__tests__/helpers/op-sqlite-mock.ts',
      },
    },
    // React Native component/integration tests
    {
      displayName: 'rn',
      preset: '@react-native/jest-preset',
      testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx,js}'],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|@react-navigation)/)',
      ],
    },
  ],
};

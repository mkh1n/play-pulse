import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.spec.json',
      },
    ],
  },
  testEnvironment: 'node',
  
  // Настройки для вывода времени выполнения и логов
  verbose: true,
  testTimeout: 30000,
  
  // Собираем coverage только если нужно
  collectCoverage: false,
  
  // Игнорируем node_modules и dist
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
  
  // Display slow tests
  detectOpenHandles: true,
  
  // Console output
  forceExit: false,
  detectLeaks: false,
};

export default config;
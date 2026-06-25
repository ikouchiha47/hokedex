import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import type { BootstrapResult } from '../src/services/appBootstrap';

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
}));

jest.mock('../src/navigation/RootNavigator', () => ({
  RootNavigator: () => null,
}));

jest.mock('../src/services/share', () => ({
  onSharedImage: jest.fn(() => () => {}),
}));

jest.mock('../src/services/AppLockManager', () => ({
  onBackground: jest.fn(),
  onForeground: jest.fn(() => false),
  resetTimer: jest.fn(),
}));

jest.mock('../src/db/queries/app_settings', () => ({
  setSettingValue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/appBootstrap', () => ({
  defaultBootstrap: jest.fn(),
}));

jest.mock('../src/screens/OnboardingScreen', () => ({
  OnboardingScreen: ({ onDone }: any) => {
    const React = require('react');
    const { Text, Pressable } = require('react-native');
    return React.createElement(Pressable, { testID: 'onboarding-done', onPress: onDone },
      React.createElement(Text, null, 'Onboarding'),
    );
  },
}));

jest.mock('../src/screens/LockScreen', () => ({
  LockScreen: () => null,
}));

jest.mock('../src/screens/PinSetupScreen', () => ({
  PinSetupScreen: () => null,
}));

jest.mock('../src/AppContext', () => ({
  AppProvider: ({ children }: any) => children,
  useApp: () => ({ db: {}, collectionRoot: '/tmp', category: mockCategory }),
}));

const mockCategory = { id: 'people', name: 'People', embedding_dimensions: 512 } as any;
const mockDb = {} as any;

function makeBootstrap(overrides: Partial<BootstrapResult> = {}): () => Promise<BootstrapResult> {
  return () => Promise.resolve({
    db: mockDb,
    collectionRoot: '/tmp/test',
    category: mockCategory,
    pinExists: false,
    onboardingDone: false,
    sharedUri: null,
    ...overrides,
  });
}

describe('App boot states', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders booting state initially', async () => {
    let resolve!: (v: BootstrapResult) => void;
    const bootstrap = () => new Promise<BootstrapResult>(r => { resolve = r; });

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<App bootstrap={bootstrap} />);
    });

    const json = renderer.toJSON() as any;
    expect(json).not.toBeNull();

    resolve({
      db: mockDb, collectionRoot: '/tmp', category: mockCategory,
      pinExists: false, onboardingDone: true, sharedUri: null,
    });
  });

  test('renders onboarding when onboardingDone is false', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <App bootstrap={makeBootstrap({ onboardingDone: false })} />,
      );
    });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Onboarding');
  });

  test('renders error state when bootstrap throws', async () => {
    const bootstrap = () => Promise.reject(new Error('DB init failed'));

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<App bootstrap={bootstrap} />);
    });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('DB init failed');
  });
});

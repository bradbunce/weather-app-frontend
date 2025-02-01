import React from 'react';
import { render, act } from '@testing-library/react';
import { LDProvider } from '../LaunchDarklyContext';
import * as launchDarklyReactSDK from 'launchdarkly-react-client-sdk';
import { createLDContexts, getStoredLogLevel, storeLogLevel } from '../../config/launchDarkly';

// Mock the LaunchDarkly config module
jest.mock('../../config/launchDarkly', () => ({
  createLDContexts: jest.fn(() => ({
    kind: "multi",
    user: { kind: "user", key: "anonymous", anonymous: true },
    application: { kind: "application", key: "weather-app", environment: "development" }
  })),
  getStoredLogLevel: jest.fn(() => 'info'),
  storeLogLevel: jest.fn()
}));

// Mock console methods
const mockConsole = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
global.console = { ...console, ...mockConsole };

// Mock environment variables
const mockEnvVars = {
  REACT_APP_LD_CLIENTSIDE_ID: 'mock-client-id',
  REACT_APP_LD_SDK_LOG_FLAG_KEY: 'sdk-log-level'
};

describe('LaunchDarklyContext', () => {
  let mockLDClient;
  let mockVariation;
  let mockOn;
  let mockOff;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...mockEnvVars };

    // Reset console mocks
    Object.values(mockConsole).forEach(mock => mock.mockClear());

    // Reset LaunchDarkly config mocks
    getStoredLogLevel.mockClear();
    storeLogLevel.mockClear();

    // Create mock LD client
    mockVariation = jest.fn().mockReturnValue('info');
    mockOn = jest.fn();
    mockOff = jest.fn();

    mockLDClient = {
      variation: mockVariation,
      on: mockOn,
      off: mockOff,
      _client: {
        logger: {
          debug: mockConsole.debug,
          info: mockConsole.info,
          warn: mockConsole.warn,
          error: mockConsole.error
        }
      }
    };

    // Mock the asyncWithLDProvider function
    jest.spyOn(launchDarklyReactSDK, 'asyncWithLDProvider')
      .mockImplementation(async (config) => {
        const LDProvider = ({ children }) => <div>{children}</div>;
        LDProvider.client = mockLDClient;
        return LDProvider;
      });
  });

  const waitForEffects = async () => {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  };

  it('initializes with stored log level', async () => {
    getStoredLogLevel.mockReturnValue('warn');

    await act(async () => {
      render(<LDProvider>Test</LDProvider>);
    });
    await waitForEffects();

    // Verify initialization logging
    expect(console.log).toHaveBeenCalledWith('=== Initializing LaunchDarkly Client ===');
    expect(console.log).toHaveBeenCalledWith('Setting SDK log level to: warn');
    expect(console.log).toHaveBeenCalledWith('=== LaunchDarkly Client Initialized ===');
  });

  it('updates log level when flag changes', async () => {
    await act(async () => {
      render(<LDProvider>Test</LDProvider>);
    });
    await waitForEffects();

    // Simulate flag change
    mockVariation.mockReturnValue('debug');
    const flagKey = process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY;
    const changeHandler = mockOn.mock.calls.find(call => call[0] === `change:${flagKey}`)?.[1];
    expect(changeHandler).toBeDefined();

    // Trigger flag change
    await act(async () => {
      await changeHandler();
    });
    await waitForEffects();

    // Verify log level was stored
    expect(storeLogLevel).toHaveBeenCalledWith('debug');

    // Verify change logging
    expect(console.log).toHaveBeenCalledWith('=== Log Level Changed ===');
    expect(console.log).toHaveBeenCalledWith('New log level will be: debug');
  });

  it('handles missing flag key gracefully', async () => {
    delete process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY;

    await act(async () => {
      render(<LDProvider>Test</LDProvider>);
    });
    await waitForEffects();

    // Should still initialize with stored level
    expect(getStoredLogLevel).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('=== Initializing LaunchDarkly Client ===');
  });
});

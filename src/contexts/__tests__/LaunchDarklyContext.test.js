import React from 'react';
import { render, act } from '@testing-library/react';
import { LDProvider } from '../LaunchDarklyContext';
import * as launchDarklyReactSDK from 'launchdarkly-react-client-sdk';
import { createLDContexts } from '../../config/launchDarkly';

// Mock the LaunchDarkly config module
const mockContexts = {
  kind: "multi",
  user: {
    kind: "user",
    key: "anonymous"
  },
  application: {
    kind: "application",
    key: undefined,
    environment: undefined
  }
};

jest.mock('../../config/launchDarkly', () => ({
  createLDContexts: jest.fn((user) => mockContexts)
}));

// Mock the logger with all required methods
const mockLogger = {
  // Standard logging levels
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  // Additional methods that might be expected
  log: jest.fn(),
  isDebugEnabled: jest.fn(() => true)
};

jest.mock('@bradbunce/launchdarkly-react-logger', () => ({
  useLogger: () => mockLogger
}));

// Mock environment variables
const mockEnvVars = {
  REACT_APP_LD_CLIENTSIDE_ID: 'mock-client-id',
  REACT_APP_LD_SDK_LOG_FLAG_KEY: 'sdk-log-level'
};

describe('LaunchDarklyContext', () => {
  let mockLDClient;
  let mockSetLogLevel;
  let mockVariation;
  let mockOn;
  let mockOff;
  let mockProviderConfig;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...mockEnvVars };

    // Create mock LD client with logger methods
    mockSetLogLevel = jest.fn();
    mockVariation = jest.fn().mockReturnValue('info');
    mockOn = jest.fn();
    mockOff = jest.fn();

    mockLDClient = {
      setLogLevel: mockSetLogLevel,
      variation: mockVariation,
      on: mockOn,
      off: mockOff,
      logger: mockLogger,
      client: {
        setLogLevel: mockSetLogLevel,
        variation: mockVariation,
        on: mockOn,
        off: mockOff,
        logger: mockLogger
      }
    };

    // Mock the asyncWithLDProvider function
    jest.spyOn(launchDarklyReactSDK, 'asyncWithLDProvider')
      .mockImplementation(async (config) => {
        // Store config for verification
        mockProviderConfig = {
          clientSideID: config.clientSideID,
          context: config.context,
          timeout: config.timeout,
          options: config.options
        };

        const LDProvider = ({ children, onReady }) => {
          const [client, setClient] = React.useState(null);
          const initializationRef = React.useRef(false);

          // Initialize LaunchDarkly client
          React.useEffect(() => {
            if (initializationRef.current) return;
            initializationRef.current = true;

            const initClient = async () => {
              try {
                setClient(mockLDClient);
                onReady?.();
              } catch (error) {
                mockLogger.error("Error initializing LaunchDarkly", { error: error.message });
              }
            };

            initClient();
          }, [onReady]);

          // Update log level when flag changes
          React.useEffect(() => {
            if (!client) return;

            const logLevelFlagKey = process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY;
            if (!logLevelFlagKey) return;

            const handleFlagChange = (flagKey) => {
              if (flagKey === logLevelFlagKey) {
                const newLogLevel = client.variation(logLevelFlagKey, 'info');
                client.setLogLevel(newLogLevel);
                mockLogger.info(`LaunchDarkly SDK log level updated to: ${newLogLevel}`);
              }
            };

            const initialLogLevel = client.variation(logLevelFlagKey, 'info');
            client.setLogLevel(initialLogLevel);
            mockLogger.info(`LaunchDarkly SDK log level initialized to: ${initialLogLevel}`);

            client.on('change', handleFlagChange);
            return () => {
              client.off('change', handleFlagChange);
            };
          }, [client]);

          if (!client) {
            return <div />;
          }

          return <div>{children}</div>;
        };
        LDProvider.client = mockLDClient;
        return LDProvider;
      });

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const waitForEffects = async () => {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  };

  it('initializes with default log level', async () => {
    const onReady = jest.fn();

    await act(async () => {
      render(<LDProvider onReady={onReady}>Test</LDProvider>);
    });

    // Wait for initialization and flag monitoring effects
    await waitForEffects();
    await waitForEffects();

    // Verify createLDContexts was called with null user
    expect(createLDContexts).toHaveBeenCalledWith(null);

    // Verify initialization config
    expect(mockProviderConfig).toBeDefined();
    expect(mockProviderConfig.clientSideID).toBe('mock-client-id');
    expect(mockProviderConfig.context).toEqual(mockContexts);
    expect(mockProviderConfig.timeout).toBe(2);
    expect(mockProviderConfig.options).toEqual({
      logger: mockLogger,
      bootstrap: { 'sdk-log-level': 'info' }
    });

    // Verify onReady callback
    expect(onReady).toHaveBeenCalled();
  });

  it('sets initial log level from flag evaluation', async () => {
    mockVariation.mockReturnValue('debug');

    await act(async () => {
      render(<LDProvider>Test</LDProvider>);
    });

    // Wait for initialization and flag monitoring effects
    await waitForEffects();
    await waitForEffects();

    // Verify log level was set from flag
    expect(mockVariation).toHaveBeenCalledWith('sdk-log-level', 'info');
    expect(mockSetLogLevel).toHaveBeenCalledWith('debug');
    expect(mockLogger.info).toHaveBeenCalledWith('LaunchDarkly SDK log level initialized to: debug');
  });

  it('updates log level when flag changes', async () => {
    await act(async () => {
      render(<LDProvider>Test</LDProvider>);
    });

    // Wait for initialization and flag monitoring effects
    await waitForEffects();
    await waitForEffects();

    // Verify change listener was registered
    expect(mockOn).toHaveBeenCalledWith('change', expect.any(Function));

    // Simulate flag change
    mockVariation.mockReturnValue('debug');
    const changeHandler = mockOn.mock.calls[0][1];
    await act(async () => {
      changeHandler('sdk-log-level');
    });

    await waitForEffects();

    // Verify log level was updated
    expect(mockSetLogLevel).toHaveBeenCalledWith('debug');
    expect(mockLogger.info).toHaveBeenCalledWith('LaunchDarkly SDK log level updated to: debug');
  });

  it('cleans up event listeners on unmount', async () => {
    let rendered;
    await act(async () => {
      rendered = render(<LDProvider>Test</LDProvider>);
    });

    // Wait for initialization and flag monitoring effects
    await waitForEffects();
    await waitForEffects();

    // Verify change listener was registered
    expect(mockOn).toHaveBeenCalledWith('change', expect.any(Function));

    // Get the registered handler for cleanup verification
    const changeHandler = mockOn.mock.calls[0][1];

    // Unmount component
    await act(async () => {
      rendered.unmount();
    });

    await waitForEffects();

    // Verify listener was removed with the same handler
    expect(mockOff).toHaveBeenCalledWith('change', changeHandler);
  });

  it('handles missing flag key gracefully', async () => {
    // Remove flag key from environment
    delete process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY;

    await act(async () => {
      render(<LDProvider>Test</LDProvider>);
    });

    // Wait for initialization and flag monitoring effects
    await waitForEffects();
    await waitForEffects();

    // Verify no flag evaluation or log level changes
    expect(mockVariation).not.toHaveBeenCalled();
    expect(mockSetLogLevel).not.toHaveBeenCalled();
  });
});

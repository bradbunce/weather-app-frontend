const mockUserContext = {
  kind: "user",
  key: "anonymous",
  name: undefined,
  email: undefined,
  anonymous: true
};

const mockApplicationContext = {
  kind: "application",
  key: undefined,
  environment: undefined
};

export const ContextKinds = {
  USER: {
    kind: "user",
    createContext: () => mockUserContext
  },
  APPLICATION: {
    kind: "application",
    createContext: () => mockApplicationContext
  }
};

export const createLDContexts = jest.fn(() => ({
  kind: "multi",
  user: mockUserContext,
  application: mockApplicationContext
}));

export const evaluateApplicationFlag = jest.fn();

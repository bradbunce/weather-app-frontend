import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { withLDConsumer } from "launchdarkly-react-client-sdk";
import axios from "axios";
import { useLogger } from "../utils/logger";
import { createLDContexts } from "../config/launchDarkly";
import { useWebSocketCleanup } from './WebSocketContext';

const AUTH_API_URL = process.env.REACT_APP_AUTH_API;
const TOKEN_STORAGE_KEY = "authToken";

const AuthContext = createContext(null);

const AuthProviderComponent = ({ children, flags, ldClient, onReady }) => {
  const logger = useLogger();
  const [authState, setAuthState] = useState({
    user: null,
    isAuthenticated: false,
    isInitialized: false,
    isLoading: true
  });
  const initializeStarted = useRef(false);
  const [loginCallbacks] = useState({
    onLoginSuccess: null
  });
  
  // Format token based on API needs - wrapped in useCallback
  const formatTokenForApi = useCallback((token, needsBearer = true) => {
    return needsBearer ? `Bearer ${token}` : token;
  }, []);

  // Combined state update function to prevent multiple re-renders
  const updateAuthState = useCallback((updates) => {
    setAuthState(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (initializeStarted.current) return;
      initializeStarted.current = true;

      logger.info("Initializing authentication state");
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      logger.debug("Stored token status:", { 
        hasToken: !!storedToken,
        tokenStart: storedToken ? storedToken.substring(0, 20) + '...' : null
      });

      if (storedToken) {
        logger.debug("Found stored token, validating...");
        try {
          logger.debug("Making validate-token request to:", `${AUTH_API_URL}/validate-token`);
          const response = await axios.get(`${AUTH_API_URL}/validate-token`, {
            headers: {
              Authorization: formatTokenForApi(storedToken, true),
            },
          });

          const userData = response.data.user;
          logger.debug("Token validation response:", {
            status: response.status,
            userData: {
              id: userData?.id,
              username: userData?.username,
              email: userData?.email
            }
          });

          logger.info("Token validation successful", { userId: userData.id });
          
          updateAuthState({
            user: { ...userData, token: storedToken },
            isAuthenticated: true,
            isInitialized: true,
            isLoading: false
          });

          axios.defaults.headers.common["Authorization"] = formatTokenForApi(
            storedToken,
            true
          );
        } catch (error) {
          logger.warn("Stored token validation failed", {
            error: error.message,
            stack: error.stack,
            response: error.response?.data,
            status: error.response?.status
          });
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          delete axios.defaults.headers.common["Authorization"];
          
          updateAuthState({
            user: null,
            isAuthenticated: false,
            isInitialized: true,
            isLoading: false
          });
        }
      } else {
        updateAuthState({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false
        });
      }

      onReady?.();
      logger.debug("Auth initialization complete", {
        isAuthenticated: !!storedToken,
      });
    };

    initializeAuth();
  }, [logger, formatTokenForApi, onReady, updateAuthState]);

  // Update LaunchDarkly context when user changes
  useEffect(() => {
    const updateLDContext = async () => {
      if (!ldClient || !authState.isInitialized) {
        logger.debug("LaunchDarkly client not yet initialized");
        return;
      }

      const newContexts = createLDContexts(authState.user);
      const currentContext = await ldClient.getContext();

      // Only update if contexts are different
      if (JSON.stringify(currentContext) !== JSON.stringify(newContexts)) {
        logger.debug("Updating LaunchDarkly contexts", {
          hasUser: !!authState.user,
          username: authState.user?.username,
        });

        try {
          await ldClient.identify(newContexts);
          logger.debug("LaunchDarkly contexts updated successfully");
        } catch (error) {
          logger.error("Error updating LaunchDarkly contexts", {
            error: error.message,
            stack: error.stack,
          });
        }
      }
    };

    updateLDContext();
  }, [authState.user, authState.isInitialized, logger, ldClient]);

  const login = async (credentials) => {
    logger.info("Attempting login", { username: credentials.username });
    try {
      updateAuthState({ isLoading: true });
      const response = await axios.post(
        `${AUTH_API_URL}/login`,
        {
          username: credentials.username,
          password: credentials.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const responseData =
        typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data;

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      const { token, user: userData } = responseData;

      // Get userId from token payload
      const tokenParts = token.split(".");
      const tokenPayload = JSON.parse(
        atob(
          tokenParts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(
              tokenParts[1].length + ((4 - (tokenParts[1].length % 4)) % 4),
              "="
            )
        )
      );
      const userId = tokenPayload.userId;

      // Manual token inspection
      logger.debug("Token details:", {
        tokenLength: token.length,
        tokenStart: token.substring(0, 20),
        tokenPayload,
        tokenExpiry: new Date(tokenPayload.exp * 1000),
        isExpired: Date.now() >= tokenPayload.exp * 1000,
      });

      if (!token || !userData) {
        logger.error("Invalid server response format", {
          hasToken: Boolean(token),
          hasUserData: Boolean(userData),
        });
        throw new Error("Invalid response format from server");
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      
      // Set auth headers before calling location fetch callback
      axios.defaults.headers.common["Authorization"] = formatTokenForApi(
        token,
        true
      );

      // Update auth state
      updateAuthState({
        user: {
          ...userData,
          token,
          id: userId,
        },
        isAuthenticated: true,
        isLoading: false
      });

      // If we have a login success callback (from LocationsContext), call it
      if (loginCallbacks.onLoginSuccess) {
        try {
          await loginCallbacks.onLoginSuccess();
        } catch (error) {
          logger.error("Error in login success callback", { error });
        }
      }

      logger.info("Login successful", {
        userId,
        username: userData.username,
      });
      return true;
    } catch (error) {
      logger.error("Login failed", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });

      localStorage.removeItem(TOKEN_STORAGE_KEY);
      delete axios.defaults.headers.common["Authorization"];

      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Login failed. Please try again."
      );
    }
  };

  const logout = async () => {
    logger.info("Initiating logout process");
    const cleanup = useWebSocketCleanup();
    
    try {
        // First do WebSocket cleanup
        await cleanup(authState.user?.token);

        const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (currentToken) {
            try {
                await axios.post(
                    `${AUTH_API_URL}/logout`,
                    {},
                    {
                        headers: {
                            Authorization: formatTokenForApi(currentToken, true),
                        },
                    }
                );
            } catch (error) {
                logger.warn("Logout API notification failed", {
                    error: error.message,
                    stack: error.stack,
                });
            }
        }
    } catch (error) {
        logger.error("Logout process error", {
            error: error.message,
            stack: error.stack,
        });
    } finally {
        window.dispatchEvent(new Event("auth-logout"));

        updateAuthState({
            user: null,
            isAuthenticated: false
        });
        
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        delete axios.defaults.headers.common["Authorization"];
        logger.info("Logout complete");
    }
};

  const refreshToken = async () => {
    logger.debug("Attempting token refresh");
    try {
      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!currentToken) {
        logger.warn("Token refresh failed - No token found");
        throw new Error("No token to refresh");
      }

      const response = await axios.post(
        `${AUTH_API_URL}/refresh-token`,
        {},
        {
          headers: {
            Authorization: formatTokenForApi(currentToken, true),
          },
        }
      );

      const { token: newToken } = response.data;

      if (!newToken) {
        throw new Error("No token received from server");
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      updateAuthState({
        user: {
          ...authState.user,
          token: newToken
        }
      });
      
      axios.defaults.headers.common["Authorization"] = formatTokenForApi(
        newToken,
        true
      );

      return true;
    } catch (error) {
      logger.error("Token refresh failed", {
        error: error.message,
        stack: error.stack,
      });
      logout();
      throw error;
    }
  };

  const updateProfile = async ({ username, email, currentPassword }) => {
    if (!authState.user) {
      logger.error("Update profile failed: No user data available");
      throw new Error("You must be logged in to update your profile");
    }

    if (!authState.user.token) {
      logger.error("Update profile failed: No authentication token available");
      throw new Error("Authentication token is missing");
    }

    logger.info("Attempting to update profile", { 
      username, 
      email,
      currentUserId: authState.user.id,
      currentUsername: authState.user.username 
    });

    try {
      const response = await axios.post(
        `${AUTH_API_URL}/update-profile`,
        {
          username,
          email,
          currentPassword
        },
        {
          headers: {
            Authorization: formatTokenForApi(authState.user.token, true),
          },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Update the user state with new information
      updateAuthState({
        user: {
          ...authState.user,
          username: username || authState.user.username,
          email: email || authState.user.email
        }
      });

      logger.info("Profile updated successfully", {
        userId: authState.user.id,
        newUsername: username,
        newEmail: email
      });
      
      return true;
    } catch (error) {
      logger.error("Profile update failed", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Handle specific error cases
      if (error.response?.status === 409) {
        const errorMessage = error.response.data.message;
        if (errorMessage.includes("username")) {
          throw new Error("This username is already taken");
        } else if (errorMessage.includes("email")) {
          throw new Error("This email address is already in use");
        }
      } else if (error.response?.status === 401) {
        throw new Error("Current password is incorrect");
      }

      throw new Error(
        error.response?.data?.message ||
        error.message ||
        "Failed to update profile. Please try again."
      );
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    logger.info("Attempting to update password");
    try {
      const response = await axios.post(
        `${AUTH_API_URL}/update-password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: formatTokenForApi(authState.user.token, true),
          },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      logger.info("Password updated successfully");
      return true;
    } catch (error) {
      logger.error("Password update failed", {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update password. Please try again."
      );
    }
  };

  const resetPassword = async (email) => {
    logger.info("Attempting password reset", { email });
    try {
      const response = await axios.post(
        `${AUTH_API_URL}/reset-password-request`,
        { email },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      logger.info("Password reset link sent successfully");
      return true;
    } catch (error) {
      logger.error("Password reset failed", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to send password reset link. Please try again."
      );
    }
  };

  const confirmPasswordReset = async (resetToken, newPassword) => {
    logger.info("Attempting to confirm password reset");
    try {
      const response = await axios.post(
        `${AUTH_API_URL}/reset-password-confirm`,
        {
          resetToken,
          newPassword,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      logger.info("Password reset confirmed successfully");
      return true;
    } catch (error) {
      logger.error("Password reset confirmation failed", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Map specific error messages to user-friendly ones
      if (error.response?.data?.error === "Invalid or expired reset token") {
        throw new Error(
          "This reset link has expired or already been used. Please request a new password reset."
        );
      }

      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to reset password. Please try again."
      );
    }
  };

  const registerLoginCallback = useCallback((callback) => {
    loginCallbacks.onLoginSuccess = callback;
  }, [loginCallbacks]);

  const value = {
    user: authState.user,
    currentUser: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    isInitialized: authState.isInitialized,
    login,
    logout,
    refreshToken,
    updatePassword,
    resetPassword,
    confirmPasswordReset,
    updateProfile,
    registerLoginCallback 
  };

  // Debug log the current auth state
  logger.debug("Current auth state:", {
    hasUser: !!authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    isInitialized: authState.isInitialized,
    username: authState.user?.username,
    email: authState.user?.email
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;

export const AuthProvider = withLDConsumer()(AuthProviderComponent);
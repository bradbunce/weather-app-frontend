import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { withLDConsumer } from "launchdarkly-react-client-sdk";
import axios from "axios";
import { useLogger } from "../utils/logger";
import { createLDContexts } from "../config/launchDarkly";

const AUTH_API_URL = process.env.REACT_APP_AUTH_API;
const TOKEN_STORAGE_KEY = "authToken";

const AuthContext = createContext(null);

const AuthProviderComponent = ({ children, flags, ldClient, onReady }) => {
  const logger = useLogger();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Format token based on API needs - wrapped in useCallback
  const formatTokenForApi = useCallback((token, needsBearer = true) => {
    return needsBearer ? `Bearer ${token}` : token;
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      logger.info("Initializing authentication state");
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  
      if (storedToken) {
        logger.debug("Found stored token, validating...");
        try {
          const response = await axios.get(`${AUTH_API_URL}/validate-token`, {
            headers: {
              Authorization: formatTokenForApi(storedToken, true),
            },
          });
  
          const userData = response.data.user;
          logger.debug("User data from response:", userData);
          logger.info("Token validation successful", { userId: userData.id });
          setUser({ ...userData, token: storedToken });
          setIsAuthenticated(true);
          axios.defaults.headers.common["Authorization"] = formatTokenForApi(
            storedToken,
            true
          );
        } catch (error) {
          logger.warn("Stored token validation failed", {
            error: error.message,
            stack: error.stack,
          });
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          delete axios.defaults.headers.common["Authorization"];
        }
      }
  
      setIsLoading(false);
      onReady?.(); // Call onReady when auth initialization is complete
      logger.debug("Auth initialization complete", {
        isAuthenticated: Boolean(storedToken),
      });
    };
  
    initializeAuth();
  }, [logger, formatTokenForApi, onReady]);

  // Update LaunchDarkly context when user changes
  useEffect(() => {
    const updateLDContext = async () => {
      if (!ldClient) {
        logger.debug("LaunchDarkly client not yet initialized");
        return;
      }

      const newContexts = createLDContexts(user);
      const currentContext = await ldClient.getContext();

      // Only update if contexts are different
      if (JSON.stringify(currentContext) !== JSON.stringify(newContexts)) {
        logger.debug("Updating LaunchDarkly contexts", {
          hasUser: !!user,
          username: user?.username,
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
  }, [user, logger, ldClient]);

  const login = async (credentials) => {
    logger.info("Attempting login", { username: credentials.username });
    try {
      setIsLoading(true);
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
      setUser({
        ...userData,
        token,
        id: userId,
      });
      setIsAuthenticated(true);
      axios.defaults.headers.common["Authorization"] = formatTokenForApi(
        token,
        true
      );

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

      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      delete axios.defaults.headers.common["Authorization"];

      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    logger.info("Initiating logout process");
    try {
      if (window.activeWebSockets) {
        logger.debug(`Closing WebSocket connections`, {
          connectionCount: window.activeWebSockets.size,
        });
        const closePromises = Array.from(window.activeWebSockets).map((ws) => {
          return new Promise((resolve) => {
            const originalOnClose = ws.onclose;
            ws.onclose = (event) => {
              if (originalOnClose) originalOnClose.call(ws, event);
              resolve();
            };

            try {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: "unsubscribe" }));
              }
              ws.close();
            } catch (error) {
              logger.error("Error closing WebSocket", {
                error: error.message,
                stack: error.stack,
              });
              resolve();
            }
          });
        });

        await Promise.race([
          Promise.all(closePromises),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
        window.activeWebSockets.clear();
      }

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

      setUser(null);
      setIsAuthenticated(false);
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
      setUser((prev) => ({ ...prev, token: newToken }));
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

  const updatePassword = async (currentPassword, newPassword) => {
    logger.info("Attempting to update password");
    try {
      const response = await axios.post(
        `${AUTH_API_URL}/update-password`,
        { 
          currentPassword,
          newPassword
        },
        {
          headers: {
            Authorization: formatTokenForApi(user.token, true),
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
                newPassword
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
            throw new Error("This reset link has expired or already been used. Please request a new password reset.");
        }

        throw new Error(
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            "Failed to reset password. Please try again."
        );
    }
};

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    updatePassword,
    resetPassword,
    confirmPasswordReset,
  };

  if (isLoading) {
    logger.trace("Rendering loading state");
    return null;
  }

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

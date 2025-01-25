import React, { useEffect, useCallback } from "react";
import { Navbar, Nav, Container, Button, ButtonGroup } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useFontSize } from "../contexts/FontSizeContext";
import { useLogger } from "../utils/logger";
import { Sun, Moon, Minus, Plus } from "lucide-react";

/**
 * NavigationBar component
 * Provides navigation, authentication controls, theme toggle, and font size controls
 */
export const NavigationBar = () => {
  // Hooks
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { fontSize, increaseFontSize, decreaseFontSize } = useFontSize();
  const navigate = useNavigate();
  const logger = useLogger();

  // Update CSS variable when fontSize changes
  useEffect(() => {
    logger.debug('Updating base font size', { fontSize });
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
  }, [fontSize, logger]);

  // Handle theme toggle
  const handleThemeToggle = useCallback(() => {
    logger.debug('Toggling theme', { currentTheme: theme });
    toggleTheme();
  }, [theme, toggleTheme, logger]);

  // Handle font size changes
  const handleIncreaseFontSize = useCallback(() => {
    logger.debug('Increasing font size', { currentSize: fontSize });
    increaseFontSize();
  }, [fontSize, increaseFontSize, logger]);

  const handleDecreaseFontSize = useCallback(() => {
    logger.debug('Decreasing font size', { currentSize: fontSize });
    decreaseFontSize();
  }, [fontSize, decreaseFontSize, logger]);

  // Handle logout
  const handleLogout = useCallback(() => {
    logger.info('User logging out');
    logout();
    navigate("/");
  }, [logout, navigate, logger]);

  logger.debug('Rendering NavigationBar', { 
    isAuthenticated, 
    theme,
    fontSize 
  });

  return (
    <Navbar expand="lg" className="navbar-dark">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <img
            src={require('../assets/images/LD_Logo.png')}
            alt="Weather App Logo"
            className="navbar-logo me-2"
          />
          Weather App
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {!isAuthenticated ? (
              <>
                <Nav.Link as={Link} to="/login">
                  Login
                </Nav.Link>
                <Nav.Link as={Link} to="/register">
                  Register
                </Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/dashboard">
                  Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/profile">
                  Profile
                </Nav.Link>
                <Button 
                  variant="link" 
                  as={Nav.Link} 
                  onClick={handleLogout}
                  className="me-2"
                >
                  Logout
                </Button>
              </>
            )}
            {/* Theme toggle button */}
            <Button
              variant="link"
              size="sm"
              onClick={handleThemeToggle}
              className="d-flex align-items-center text-white me-2"
              style={{ padding: '0.4rem' }}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? 
                <Moon style={{ width: 'calc(var(--base-font-size) * 1.125)', height: 'calc(var(--base-font-size) * 1.125)' }} /> : 
                <Sun style={{ width: 'calc(var(--base-font-size) * 1.125)', height: 'calc(var(--base-font-size) * 1.125)' }} />
              }
            </Button>

            {/* Font size controls */}
            <ButtonGroup className="font-size-controls">
              <Button
                variant="link"
                size="sm"
                onClick={handleIncreaseFontSize}
                className="d-flex align-items-center text-white"
                style={{ padding: '0.4rem' }}
                aria-label="Increase font size"
              >
                <Plus style={{ width: 'calc(var(--base-font-size) * 1.125)', height: 'calc(var(--base-font-size) * 1.125)' }} />
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={handleDecreaseFontSize}
                className="theme-toggle d-flex align-items-center text-white"
                style={{ padding: '0.4rem' }}
                aria-label="Decrease font size"
              >
                <Minus style={{ width: 'calc(var(--base-font-size) * 1.125)', height: 'calc(var(--base-font-size) * 1.125)' }} />
              </Button>
            </ButtonGroup>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

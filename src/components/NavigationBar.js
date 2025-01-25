import React, { useEffect } from "react";
import { Navbar, Nav, Container, Button, ButtonGroup } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useFontSize } from "../contexts/FontSizeContext";
import { Sun, Moon, Minus, Plus } from "lucide-react";

export const NavigationBar = () => {
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { fontSize, increaseFontSize, decreaseFontSize } = useFontSize();
  const navigate = useNavigate();

  // Update CSS variable when fontSize changes
  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
  }, [fontSize]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Navbar expand="lg" className="navbar-dark">
      <Container>
        <Navbar.Brand as={Link} to="/">
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
            <ButtonGroup className="ms-2 me-2 font-size-controls">
              <Button
                variant="outline-theme"
                size="sm"
                onClick={decreaseFontSize}
                className="theme-toggle d-flex align-items-center"
                style={{ padding: '0.4rem' }}
              >
                <Minus size={18} />
              </Button>
              <Button
                variant="outline-theme"
                size="sm"
                onClick={increaseFontSize}
                className="d-flex align-items-center"
                style={{ padding: '0.4rem' }}
              >
                <Plus size={18} />
              </Button>
            </ButtonGroup>
            <Button
              variant="outline-theme"
              size="sm"
              onClick={toggleTheme}
              className="d-flex align-items-center"
              style={{ padding: '0.4rem' }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

// client/src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Load user from localStorage on component mount and when location changes
  useEffect(() => {
    const loadUser = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setUser(null);
      }
      setLoading(false);
    };

    loadUser();

    // Listen for storage changes (in case of logout from another tab)
    const handleStorageChange = () => {
      loadUser();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [location]);

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    
    // Call logout endpoint
    if (sessionId) {
      try {
        await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': sessionId,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    // Clear client-side storage
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  // Check if user is logged in
  const isLoggedIn = !!user;

  // Don't show navbar on login/register pages if not logged in
  if ((location.pathname === '/login' || location.pathname === '/register') && !isLoggedIn) {
    return null;
  }

  if (loading) {
    return (
      <BootstrapNavbar bg="dark" variant="dark" expand="lg">
        <Container>
          <BootstrapNavbar.Brand as={Link} to="/">
            <i className="bi bi-journal-text me-2"></i>
            LUCT Reporting System
          </BootstrapNavbar.Brand>
        </Container>
      </BootstrapNavbar>
    );
  }

  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/">
          <i className="bi bi-journal-text me-2"></i>
          LUCT Reporting System
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {isLoggedIn && (
              <>
                <Nav.Link as={Link} to="/dashboard">
                  <i className="bi bi-speedometer2 me-1"></i>
                  Dashboard
                </Nav.Link>
                
                {/* Student Navigation */}
                {user.role === 'student' && (
                  <>
                    <Nav.Link as={Link} to="/student-reports">
                      <i className="bi bi-file-text me-1"></i>
                      My Reports
                    </Nav.Link>
                    <Nav.Link as={Link} to="/rating">
                      <i className="bi bi-star me-1"></i>
                      Rate Lectures
                    </Nav.Link>
                  </>
                )}
                
                {/* Lecturer Navigation */}
                {user.role === 'lecturer' && (
                  <>
                    <Nav.Link as={Link} to="/reports">
                      <i className="bi bi-files me-1"></i>
                      Reports
                    </Nav.Link>
                    <Nav.Link as={Link} to="/reports/new">
                      <i className="bi bi-plus-circle me-1"></i>
                      New Report
                    </Nav.Link>
                    <Nav.Link as={Link} to="/classes">
                      <i className="bi bi-people me-1"></i>
                      My Classes
                    </Nav.Link>
                  </>
                )}
                
                {/* Principal Lecturer Navigation */}
                {user.role === 'principal_lecturer' && (
                  <>
                    <Nav.Link as={Link} to="/courses">
                      <i className="bi bi-book me-1"></i>
                      Courses
                    </Nav.Link>
                    <Nav.Link as={Link} to="/reports">
                      <i className="bi bi-files me-1"></i>
                      Reports
                    </Nav.Link>
                    <Nav.Link as={Link} to="/feedback">
                      <i className="bi bi-chat-left-text me-1"></i>
                      Feedback
                    </Nav.Link>
                  </>
                )}
                
                {/* Program Leader Navigation */}
                {user.role === 'program_leader' && (
                  <>
                    <Nav.Link as={Link} to="/courses">
                      <i className="bi bi-book me-1"></i>
                      Courses
                    </Nav.Link>
                    <Nav.Link as={Link} to="/reports">
                      <i className="bi bi-files me-1"></i>
                      Reports
                    </Nav.Link>
                  </>
                )}
                
                {/* Common Navigation for all roles */}
                <Nav.Link as={Link} to="/monitoring">
                  <i className="bi bi-graph-up me-1"></i>
                  Monitoring
                </Nav.Link>
                <Nav.Link as={Link} to="/rating">
                  <i className="bi bi-star me-1"></i>
                  Ratings
                </Nav.Link>
                <Nav.Link as={Link} to="/search">
                  <i className="bi bi-search me-1"></i>
                  Search
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            {isLoggedIn ? (
              <NavDropdown 
                title={
                  <>
                    <i className="bi bi-person-circle me-1"></i>
                    {user.fullName || user.username}
                  </>
                } 
                id="user-dropdown"
              >
                <NavDropdown.Item as={Link} to="/dashboard">
                  <i className="bi bi-person me-2"></i>
                  Profile
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">
                  <i className="bi bi-box-arrow-in-right me-1"></i>
                  Login
                </Nav.Link>
                <Nav.Link as={Link} to="/register">
                  <i className="bi bi-person-plus me-1"></i>
                  Register
                </Nav.Link>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
}

export default Navbar;
// client/src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Container, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const getRoleDescription = (role) => {
    switch(role) {
      case 'student':
        return 'You can monitor reports and provide ratings.';
      case 'lecturer':
        return 'You can manage classes, create reports, and monitor activities.';
      case 'principal_lecturer':
        return 'You can view courses, reports, add feedback, and monitor activities.';
      case 'program_leader':
        return 'You can manage courses, assign modules, view reports, and monitor activities.';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="text-center mt-5">
          <i className="bi bi-arrow-repeat fs-1 text-primary"></i>
          <p className="mt-2">Loading...</p>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container>
        <Alert variant="warning" className="mt-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Please log in to access the dashboard.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <h1 className="mb-4">
        <i className="bi bi-speedometer2 me-2"></i>
        Dashboard
      </h1>
      <Row>
        <Col md={8}>
          <Card>
            <Card.Body>
              <Card.Title>
                <i className="bi bi-person-circle me-2"></i>
                Welcome, {user.fullName}!
              </Card.Title>
              <Card.Text>
                <i className="bi bi-person-badge me-2"></i>
                Role: <strong>{user.role?.replace('_', ' ').toUpperCase()}</strong>
              </Card.Text>
              <Card.Text>
                <i className="bi bi-info-circle me-2"></i>
                {getRoleDescription(user.role)}
              </Card.Text>
            </Card.Body>
          </Card>
          
          <Row className="mt-4">
            <Col md={6}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>
                    <i className="bi bi-lightning me-2"></i>
                    Quick Actions
                  </Card.Title>
                  <ul className="list-unstyled">
                    {user.role === 'lecturer' && (
                      <>
                        <li><i className="bi bi-plus-circle text-success me-2"></i>Create new reports</li>
                        <li><i className="bi bi-eye text-primary me-2"></i>View your classes</li>
                        <li><i className="bi bi-people text-info me-2"></i>Monitor student attendance</li>
                      </>
                    )}
                    {user.role === 'principal_lecturer' && (
                      <>
                        <li><i className="bi bi-search text-primary me-2"></i>Review reports</li>
                        <li><i className="bi bi-chat-left-text text-success me-2"></i>Provide feedback</li>
                        <li><i className="bi bi-graph-up text-warning me-2"></i>Monitor course progress</li>
                      </>
                    )}
                    {user.role === 'program_leader' && (
                      <>
                        <li><i className="bi bi-gear text-primary me-2"></i>Manage courses</li>
                        <li><i className="bi bi-person-plus text-success me-2"></i>Assign modules</li>
                        <li><i className="bi bi-bar-chart text-info me-2"></i>View analytics</li>
                      </>
                    )}
                    {user.role === 'student' && (
                      <>
                        <li><i className="bi bi-file-text text-primary me-2"></i>View class reports</li>
                        <li><i className="bi bi-star text-warning me-2"></i>Rate lectures</li>
                        <li><i className="bi bi-graph-up text-success me-2"></i>Track learning progress</li>
                      </>
                    )}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>
                    <i className="bi bi-clock-history me-2"></i>
                    Recent Activity
                  </Card.Title>
                  <Card.Text>
                    <i className="bi bi-info-circle me-2"></i>
                    Your recent activities and notifications will appear here.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>
                <i className="bi bi-diagram-3 me-2"></i>
                System Overview
              </Card.Title>
              <Card.Text>
                <i className="bi bi-building me-2"></i>
                LUCT Reporting System helps manage academic activities, track progress,
                and facilitate communication between students, lecturers, and program leaders.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;
// client/src/components/Classes.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Container, Row, Col, Badge, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      fetchClasses();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchClasses = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await axios.get('http://localhost:5000/api/classes', {
        headers: { 'Authorization': sessionId }
      });
      setClasses(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-4">
        <i className="bi bi-arrow-repeat fs-1 text-primary"></i>
        <p className="mt-2">Loading classes...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Container>
        <Alert variant="warning" className="mt-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Please log in to access classes.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <h1 className="mb-4">
        <i className="bi bi-people me-2"></i>
        Classes
      </h1>
      
      <Row>
        {classes.map(cls => (
          <Col md={6} lg={4} key={cls.id} className="mb-4">
            <Card className="h-100">
              <Card.Header>
                <Badge bg="primary">
                  <i className="bi bi-book me-1"></i>
                  {cls.course_code}
                </Badge>
              </Card.Header>
              <Card.Body>
                <Card.Title>{cls.name}</Card.Title>
                <Card.Text>
                  <i className="bi bi-journal-text me-1"></i>
                  <strong>Course:</strong> {cls.course_name}<br/>
                  <i className="bi bi-person me-1"></i>
                  <strong>Lecturer:</strong> {cls.lecturer_name}<br/>
                  <i className="bi bi-people me-1"></i>
                  <strong>Registered Students:</strong> {cls.total_registered_students}
                </Card.Text>
              </Card.Body>
              <Card.Footer>
                <small className="text-muted">
                  <i className="bi bi-hash me-1"></i>
                  Class ID: {cls.id}
                </small>
              </Card.Footer>
            </Card>
          </Col>
        ))}
        
        {classes.length === 0 && (
          <Col>
            <Card>
              <Card.Body className="text-center">
                <i className="bi bi-people fs-1 text-muted"></i>
                <Card.Text className="mt-2">No classes found.</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Alternative Table View */}
      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">
            <i className="bi bi-list-ul me-2"></i>
            Class Details
          </h5>
        </Card.Header>
        <Card.Body>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th><i className="bi bi-people me-1"></i>Class Name</th>
                <th><i className="bi bi-journal-text me-1"></i>Course</th>
                <th><i className="bi bi-code me-1"></i>Course Code</th>
                <th><i className="bi bi-person me-1"></i>Lecturer</th>
                <th><i className="bi bi-person-check me-1"></i>Students</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => (
                <tr key={cls.id}>
                  <td>{cls.name}</td>
                  <td>{cls.course_name}</td>
                  <td>
                    <Badge bg="secondary">
                      {cls.course_code}
                    </Badge>
                  </td>
                  <td>{cls.lecturer_name}</td>
                  <td>
                    <Badge bg="info">
                      <i className="bi bi-people me-1"></i>
                      {cls.total_registered_students}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Classes;
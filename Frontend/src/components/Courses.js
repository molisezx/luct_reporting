// client/src/components/Courses.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Container, Row, Col, Badge, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    facultyId: '1' // Default to ICT faculty
  });
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      if (userObj.role === 'program_leader' || userObj.role === 'principal_lecturer') {
        fetchCourses();
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchCourses = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await axios.get('http://localhost:5000/api/courses', {
        headers: { 'Authorization': sessionId }
      });
      setCourses(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setLoading(false);
    }
  };

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ code: '', name: '', facultyId: '1' });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const sessionId = localStorage.getItem('sessionId');
      await axios.post('http://localhost:5000/api/courses', {
        ...formData,
        programLeaderId: user.id
      }, {
        headers: { 'Authorization': sessionId }
      });
      
      handleCloseModal();
      fetchCourses(); // Refresh the list
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Failed to create course: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-4">
        <i className="bi bi-arrow-repeat fs-1 text-primary"></i>
        <p className="mt-2">Loading courses...</p>
      </div>
    );
  }

  if (!user || (user.role !== 'program_leader' && user.role !== 'principal_lecturer')) {
    return (
      <Container>
        <Alert variant="warning" className="mt-3">
          <i className="bi bi-shield-exclamation me-2"></i>
          Access denied. This page is for program leaders and principal lecturers only.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>
            <i className="bi bi-book me-2"></i>
            Courses
          </h1>
        </Col>
        {user.role === 'program_leader' && (
          <Col xs="auto">
            <Button variant="primary" onClick={handleShowModal}>
              <i className="bi bi-plus-circle me-2"></i>
              Add New Course
            </Button>
          </Col>
        )}
      </Row>

      <Row>
        {courses.map(course => (
          <Col md={6} lg={4} key={course.id} className="mb-4">
            <Card className="h-100">
              <Card.Header>
                <Badge bg="success">
                  <i className="bi bi-tag me-1"></i>
                  {course.code}
                </Badge>
              </Card.Header>
              <Card.Body>
                <Card.Title>{course.name}</Card.Title>
                <Card.Text>
                  <i className="bi bi-building me-1"></i>
                  <strong>Faculty:</strong> {course.faculty_name}<br/>
                  {course.program_leader_name && (
                    <>
                      <i className="bi bi-person-badge me-1"></i>
                      <strong>Program Leader:</strong> {course.program_leader_name}
                    </>
                  )}
                </Card.Text>
              </Card.Body>
              <Card.Footer>
                <small className="text-muted">
                  <i className="bi bi-hash me-1"></i>
                  Course ID: {course.id}
                </small>
              </Card.Footer>
            </Card>
          </Col>
        ))}
        
        {courses.length === 0 && (
          <Col>
            <Card>
              <Card.Body className="text-center">
                <i className="bi bi-book fs-1 text-muted"></i>
                <Card.Text className="mt-2">No courses found.</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Table View */}
      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">
            <i className="bi bi-list-ul me-2"></i>
            Course Details
          </h5>
        </Card.Header>
        <Card.Body>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th><i className="bi bi-code me-1"></i>Code</th>
                <th><i className="bi bi-journal-text me-1"></i>Course Name</th>
                <th><i className="bi bi-building me-1"></i>Faculty</th>
                <th><i className="bi bi-person-badge me-1"></i>Program Leader</th>
                <th><i className="bi bi-gear me-1"></i>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id}>
                  <td>
                    <Badge bg="success">
                      <i className="bi bi-tag me-1"></i>
                      {course.code}
                    </Badge>
                  </td>
                  <td>{course.name}</td>
                  <td>{course.faculty_name}</td>
                  <td>{course.program_leader_name || 'Not assigned'}</td>
                  <td>
                    <Button variant="outline-primary" size="sm" className="me-2">
                      <i className="bi bi-eye me-1"></i>
                      View
                    </Button>
                    {user.role === 'program_leader' && (
                      <Button variant="outline-secondary" size="sm">
                        <i className="bi bi-pencil me-1"></i>
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Add Course Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-plus-circle me-2"></i>
            Add New Course
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-code me-1"></i>
                Course Code
              </Form.Label>
              <Form.Control
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g., DIWA2110"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-journal-text me-1"></i>
                Course Name
              </Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Web Application Development"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="bi bi-building me-1"></i>
                Faculty
              </Form.Label>
              <Form.Select
                name="facultyId"
                value={formData.facultyId}
                onChange={handleChange}
                required
              >
                <option value="1">Faculty of Information Communication Technology</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              <i className="bi bi-x-circle me-2"></i>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <i className="bi bi-check-circle me-2"></i>
              Create Course
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default Courses;
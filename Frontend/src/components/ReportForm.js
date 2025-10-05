// client/src/components/ReportForm.js
import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Container, Row, Col, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function ReportForm() {
  const [formData, setFormData] = useState({
    facultyName: '',
    className: '',
    classId: '',
    weekOfReporting: '',
    dateOfLecture: '',
    courseName: '',
    courseCode: '',
    lecturerName: '',
    actualStudentsPresent: '',
    totalRegisteredStudents: '',
    venue: '',
    scheduledTime: '',
    topicTaught: '',
    learningOutcomes: '',
    lecturerRecommendations: ''
  });
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      if (userObj.role === 'lecturer') {
        fetchClasses();
        // Pre-fill lecturer name
        setFormData(prev => ({ ...prev, lecturerName: userObj.fullName }));
      } else {
        navigate('/dashboard');
      }
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
      setClassesLoading(false);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('Failed to load classes: ' + (error.response?.data?.error || 'Please try again'));
      setClassesLoading(false);
    }
  };

  const handleClassChange = (classId) => {
    const selectedClass = classes.find(cls => cls.id == classId);
    if (selectedClass) {
      setFormData(prev => ({
        ...prev,
        classId: selectedClass.id,
        className: selectedClass.name,
        facultyName: selectedClass.faculty_name,
        courseName: selectedClass.course_name,
        courseCode: selectedClass.course_code,
        totalRegisteredStudents: selectedClass.total_registered_students
      }));
    }
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
      setError('');
      setLoading(true);
      
      const sessionId = localStorage.getItem('sessionId');
      await axios.post('http://localhost:5000/api/reports', {
        ...formData,
        actualStudentsPresent: parseInt(formData.actualStudentsPresent),
        totalRegisteredStudents: parseInt(formData.totalRegisteredStudents)
      }, {
        headers: { 'Authorization': sessionId }
      });
      
      navigate('/reports');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create report');
    }
    
    setLoading(false);
  };

  if (!user || user.role !== 'lecturer') {
    return (
      <Container>
        <Alert variant="warning" className="mt-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Access denied. This page is for lecturers only.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="justify-content-center">
        <Col xs={12} lg={10}>
          <Card className="mt-4">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">
                <i className="bi bi-file-text me-2"></i>
                Lecturer Reporting Form
              </h4>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger">
                  <i className="bi bi-x-circle me-2"></i>
                  {error}
                </Alert>
              )}
              
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-list-ul me-1"></i>
                        Class *
                      </Form.Label>
                      {classesLoading ? (
                        <div className="text-center p-3">
                          <Spinner animation="border" variant="primary" className="me-2" />
                          Loading classes...
                        </div>
                      ) : (
                        <Form.Select
                          name="classId"
                          value={formData.classId}
                          onChange={(e) => handleClassChange(e.target.value)}
                          required
                        >
                          <option value="">Select a class</option>
                          {classes.length > 0 ? (
                            classes.map(cls => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name} - {cls.course_name} ({cls.course_code})
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No classes available</option>
                          )}
                        </Form.Select>
                      )}
                      {!classesLoading && classes.length === 0 && (
                        <Form.Text className="text-danger">
                          <i className="bi bi-info-circle me-1"></i>
                          No classes found. Please contact administration to be assigned classes.
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-building me-1"></i>
                        Faculty Name *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="facultyName"
                        value={formData.facultyName}
                        onChange={handleChange}
                        required
                        readOnly
                        placeholder="Select a class to auto-fill"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-calendar-week me-1"></i>
                        Week of Reporting *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="weekOfReporting"
                        value={formData.weekOfReporting}
                        onChange={handleChange}
                        placeholder="e.g., Week 5"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-calendar-date me-1"></i>
                        Date of Lecture *
                      </Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfLecture"
                        value={formData.dateOfLecture}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-book me-1"></i>
                        Course Name *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="courseName"
                        value={formData.courseName}
                        onChange={handleChange}
                        required
                        readOnly
                        placeholder="Select a class to auto-fill"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-code me-1"></i>
                        Course Code *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="courseCode"
                        value={formData.courseCode}
                        onChange={handleChange}
                        required
                        readOnly
                        placeholder="Select a class to auto-fill"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-person-badge me-1"></i>
                        Lecturer's Name *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="lecturerName"
                        value={formData.lecturerName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-people me-1"></i>
                        Students Present *
                      </Form.Label>
                      <Form.Control
                        type="number"
                        name="actualStudentsPresent"
                        value={formData.actualStudentsPresent}
                        onChange={handleChange}
                        min="0"
                        max={formData.totalRegisteredStudents || 100}
                        required
                        disabled={!formData.classId}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-person-check me-1"></i>
                        Total Students *
                      </Form.Label>
                      <Form.Control
                        type="number"
                        name="totalRegisteredStudents"
                        value={formData.totalRegisteredStudents}
                        onChange={handleChange}
                        min="0"
                        required
                        readOnly
                        placeholder="Select a class to auto-fill"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-geo-alt me-1"></i>
                        Venue *
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="venue"
                        value={formData.venue}
                        onChange={handleChange}
                        placeholder="e.g., Room 101"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <i className="bi bi-clock me-1"></i>
                        Scheduled Time *
                      </Form.Label>
                      <Form.Control
                        type="time"
                        name="scheduledTime"
                        value={formData.scheduledTime}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="bi bi-journal-text me-1"></i>
                    Topic Taught *
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="topicTaught"
                    value={formData.topicTaught}
                    onChange={handleChange}
                    placeholder="Describe the topic covered in this lecture..."
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="bi bi-lightbulb me-1"></i>
                    Learning Outcomes *
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="learningOutcomes"
                    value={formData.learningOutcomes}
                    onChange={handleChange}
                    placeholder="What were the key learning outcomes?"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="bi bi-chat-left-text me-1"></i>
                    Lecturer Recommendations
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="lecturerRecommendations"
                    value={formData.lecturerRecommendations}
                    onChange={handleChange}
                    placeholder="Any recommendations or follow-up actions?"
                  />
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading || !formData.classId}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <i className="bi bi-hourglass-split me-2"></i>
                        Creating Report...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Submit Report
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default ReportForm;
// client/src/components/Feedback.js
import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Container, Row, Col, Alert, Badge, Modal, ListGroup } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Feedback() {
  const [reports, setReports] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [existingFeedback, setExistingFeedback] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      if (userObj.role === 'principal_lecturer') {
        fetchReports();
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchReports = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await axios.get('http://localhost:5000/api/reports', {
        headers: { 'Authorization': sessionId }
      });
      setReports(response.data);
      
      // Fetch existing feedback for these reports
      const feedbackPromises = response.data.map(report => 
        axios.get(`http://localhost:5000/api/feedback/${report.id}`, {
          headers: { 'Authorization': sessionId }
        })
      );
      
      const feedbackResponses = await Promise.all(feedbackPromises);
      const feedbackMap = {};
      
      feedbackResponses.forEach((response, index) => {
        const reportId = response.data[0]?.report_id || reports[index]?.id;
        if (reportId) {
          feedbackMap[reportId] = response.data;
        }
      });
      
      setExistingFeedback(feedbackMap);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleFeedbackChange = (reportId, text) => {
    setFeedback(prev => ({
      ...prev,
      [reportId]: text
    }));
  };

  const submitFeedback = async (reportId) => {
    if (!feedback[reportId] || feedback[reportId].trim() === '') {
      setMessage('Please enter feedback before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const sessionId = localStorage.getItem('sessionId');
      await axios.post('http://localhost:5000/api/feedback', {
        reportId,
        feedbackText: feedback[reportId]
      }, {
        headers: { 'Authorization': sessionId }
      });
      
      setMessage('Feedback submitted successfully!');
      setFeedback(prev => ({ ...prev, [reportId]: '' }));
      
      // Refresh existing feedback
      const response = await axios.get(`http://localhost:5000/api/feedback/${reportId}`, {
        headers: { 'Authorization': sessionId }
      });
      setExistingFeedback(prev => ({
        ...prev,
        [reportId]: response.data
      }));
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to submit feedback');
    }
    setSubmitting(false);
  };

  const viewFeedback = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const hasGivenFeedback = (reportId) => {
    return existingFeedback[reportId]?.some(fb => fb.principal_lecturer_id === user.id);
  };

  const getMyFeedback = (reportId) => {
    return existingFeedback[reportId]?.find(fb => fb.principal_lecturer_id === user.id);
  };

  if (!user || user.role !== 'principal_lecturer') {
    return (
      <Container>
        <Alert variant="warning" className="mt-3">
          <i className="bi bi-shield-exclamation me-2"></i>
          Access denied. This page is for principal lecturers only.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <h1 className="mb-4">
        <i className="bi bi-chat-left-text me-2"></i>
        Provide Feedback on Reports
      </h1>

      {message && (
        <Alert variant={message.includes('successfully') ? 'success' : 'danger'}>
          {message.includes('successfully') ? 
            <i className="bi bi-check-circle me-2"></i> : 
            <i className="bi bi-exclamation-triangle me-2"></i>
          }
          {message}
        </Alert>
      )}

      <Row>
        {reports.map(report => (
          <Col md={6} lg={4} key={report.id} className="mb-4">
            <Card className="h-100">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <Badge bg="primary">
                  <i className="bi bi-book me-1"></i>
                  {report.course_code}
                </Badge>
                <div>
                  {hasGivenFeedback(report.id) && (
                    <Badge bg="success" className="me-2">
                      <i className="bi bi-check-lg me-1"></i>
                      Feedback Given
                    </Badge>
                  )}
                  <Badge bg="secondary">
                    <i className="bi bi-calendar me-1"></i>
                    {new Date(report.date_of_lecture).toLocaleDateString()}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body>
                <Card.Title>{report.course_name}</Card.Title>
                <Card.Text>
                  <i className="bi bi-people me-1"></i>
                  <strong>Class:</strong> {report.class_name}<br/>
                  <i className="bi bi-person me-1"></i>
                  <strong>Lecturer:</strong> {report.lecturer_name}<br/>
                  <i className="bi bi-journal-text me-1"></i>
                  <strong>Topic:</strong> {report.topic_taught.substring(0, 80)}...
                </Card.Text>
                
                <div className="mb-3">
                  <strong>
                    <i className="bi bi-list-check me-1"></i>
                    Learning Outcomes:
                  </strong>
                  <p className="text-muted small">
                    {report.learning_outcomes.substring(0, 100)}...
                  </p>
                </div>

                {report.lecturer_recommendations && (
                  <div className="mb-3">
                    <strong>
                      <i className="bi bi-lightbulb me-1"></i>
                      Lecturer Recommendations:
                    </strong>
                    <p className="text-muted small">
                      {report.lecturer_recommendations.substring(0, 100)}...
                    </p>
                  </div>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>
                    <i className="bi bi-pencil me-1"></i>
                    Your Feedback {hasGivenFeedback(report.id) && '(Update)'}
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={feedback[report.id] || getMyFeedback(report.id)?.feedback_text || ''}
                    onChange={(e) => handleFeedbackChange(report.id, e.target.value)}
                    placeholder="Provide constructive feedback for the lecturer..."
                  />
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button
                    variant={hasGivenFeedback(report.id) ? "warning" : "primary"}
                    onClick={() => submitFeedback(report.id)}
                    disabled={submitting || !feedback[report.id]}
                  >
                    {submitting ? (
                      <>
                        <i className="bi bi-arrow-repeat spinner-border spinner-border-sm me-2"></i>
                        Submitting...
                      </>
                    ) : hasGivenFeedback(report.id) ? (
                      <>
                        <i className="bi bi-arrow-repeat me-2"></i>
                        Update Feedback
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-2"></i>
                        Submit Feedback
                      </>
                    )}
                  </Button>
                  
                  {existingFeedback[report.id] && existingFeedback[report.id].length > 0 && (
                    <Button
                      variant="outline-info"
                      onClick={() => viewFeedback(report)}
                    >
                      <i className="bi bi-eye me-2"></i>
                      View All Feedback ({existingFeedback[report.id].length})
                    </Button>
                  )}
                </div>
              </Card.Body>
              <Card.Footer>
                <small className="text-muted">
                  <i className="bi bi-calendar-week me-1"></i>
                  Week {report.week_of_reporting} • 
                  <i className="bi bi-geo-alt ms-2 me-1"></i>
                  {report.venue} • 
                  <i className="bi bi-person-check ms-2 me-1"></i>
                  Attendance: {report.actual_students_present}/{report.total_registered_students}
                </small>
              </Card.Footer>
            </Card>
          </Col>
        ))}

        {reports.length === 0 && (
          <Col>
            <Card>
              <Card.Body className="text-center">
                <i className="bi bi-inbox fs-1 text-muted"></i>
                <Card.Text className="mt-2">
                  No reports available for feedback.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Feedback Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-chat-left-text me-2"></i>
            Feedback for {selectedReport?.course_name} - {selectedReport?.class_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <>
              <Card className="mb-4">
                <Card.Body>
                  <h6>
                    <i className="bi bi-info-circle me-2"></i>
                    Report Details:
                  </h6>
                  <p><strong>Topic:</strong> {selectedReport.topic_taught}</p>
                  <p><strong>Learning Outcomes:</strong> {selectedReport.learning_outcomes}</p>
                  {selectedReport.lecturer_recommendations && (
                    <p><strong>Lecturer Recommendations:</strong> {selectedReport.lecturer_recommendations}</p>
                  )}
                </Card.Body>
              </Card>

              <h6>
                <i className="bi bi-chat-quote me-2"></i>
                All Feedback:
              </h6>
              {existingFeedback[selectedReport.id] && existingFeedback[selectedReport.id].length > 0 ? (
                <ListGroup variant="flush">
                  {existingFeedback[selectedReport.id].map((fb, index) => (
                    <ListGroup.Item key={index} className="px-0">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <strong>
                          <i className="bi bi-person me-2"></i>
                          {fb.principal_lecturer_name}
                        </strong>
                        <small className="text-muted">
                          <i className="bi bi-clock me-1"></i>
                          {new Date(fb.created_at).toLocaleDateString()}
                        </small>
                      </div>
                      <p className="mb-0">{fb.feedback_text}</p>
                      {fb.principal_lecturer_id === user.id && (
                        <Badge bg="info" className="mt-2">
                          <i className="bi bi-person-check me-1"></i>
                          Your Feedback
                        </Badge>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center">
                  <i className="bi bi-chat-square-text fs-1 text-muted"></i>
                  <p className="mt-2">No feedback provided yet.</p>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            <i className="bi bi-x-circle me-2"></i>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Feedback;
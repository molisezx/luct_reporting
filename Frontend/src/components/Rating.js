// client/src/components/Rating.js
import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Container, Row, Col, Alert, Badge, Modal } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Rating() {
  const [reports, setReports] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      
      if (userObj.role === 'student') {
        fetchStudentReports(userObj);
      } else {
        fetchAllReports();
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchStudentReports = async (userObj) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await axios.get('http://localhost:5000/api/student/reports', {
        headers: { 'Authorization': sessionId }
      });
      setReports(response.data);
      
      // Fetch existing ratings for these reports
      const ratingPromises = response.data.map(report => 
        axios.get(`http://localhost:5000/api/ratings/${report.id}`, {
          headers: { 'Authorization': sessionId }
        })
      );
      
      const ratingResponses = await Promise.all(ratingPromises);
      const ratingsMap = {};
      const commentsMap = {};
      
      ratingResponses.forEach((response, index) => {
        const reportId = response.data[0]?.report_id || reports[index].id;
        const userRating = response.data.find(rating => rating.student_name === userObj.fullName);
        
        if (userRating) {
          ratingsMap[reportId] = userRating.rating_value;
          commentsMap[reportId] = userRating.comment;
        }
      });
      
      setRatings(ratingsMap);
      setComments(commentsMap);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching student reports:', error);
      setLoading(false);
    }
  };

  const fetchAllReports = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await axios.get('http://localhost:5000/api/reports', {
        headers: { 'Authorization': sessionId }
      });
      setReports(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setLoading(false);
    }
  };

  const handleRatingChange = (reportId, rating) => {
    setRatings(prev => ({
      ...prev,
      [reportId]: rating
    }));
  };

  const handleCommentChange = (reportId, comment) => {
    setComments(prev => ({
      ...prev,
      [reportId]: comment
    }));
  };

  const submitRating = async (reportId) => {
    if (!ratings[reportId]) {
      setMessage('Please select a rating before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const sessionId = localStorage.getItem('sessionId');
      await axios.post('http://localhost:5000/api/ratings', {
        reportId,
        ratingValue: ratings[reportId],
        comment: comments[reportId] || ''
      }, {
        headers: { 'Authorization': sessionId }
      });
      
      setMessage('Rating submitted successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to submit rating');
    }
    setSubmitting(false);
  };

  const viewRatings = async (report) => {
    setSelectedReport(report);
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await axios.get(`http://localhost:5000/api/ratings/${report.id}`, {
        headers: { 'Authorization': sessionId }
      });
      setSelectedReport(prev => ({ ...prev, ratings: response.data }));
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
    setShowModal(true);
  };

  const getAverageRating = (ratingsList) => {
    if (!ratingsList || ratingsList.length === 0) return 0;
    const sum = ratingsList.reduce((acc, rating) => acc + rating.rating_value, 0);
    return (sum / ratingsList.length).toFixed(1);
  };

  if (loading) {
    return <div className="text-center mt-4">Loading reports for rating...</div>;
  }

  if (!user) {
    return (
      <Container>
        <Alert variant="warning" className="mt-3">
          Please log in to access ratings.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <h1 className="mb-4">
        {user.role === 'student' ? 'Rate Your Lectures' : 'Ratings Overview'}
      </h1>

      {message && (
        <Alert variant={message.includes('successfully') ? 'success' : 'danger'}>
          {message}
        </Alert>
      )}

      <Row>
        {reports.map(report => (
          <Col md={6} lg={4} key={report.id} className="mb-4">
            <Card className="h-100">
              <Card.Header>
                <Badge bg="primary">{report.course_code}</Badge>
                <div className="float-end">
                  <small>{new Date(report.date_of_lecture).toLocaleDateString()}</small>
                </div>
              </Card.Header>
              <Card.Body>
                <Card.Title>{report.course_name}</Card.Title>
                <Card.Text>
                  <strong>Class:</strong> {report.class_name}<br/>
                  <strong>Topic:</strong> {report.topic_taught.substring(0, 60)}...<br/>
                  <strong>Lecturer:</strong> {report.lecturer_name}<br/>
                  <strong>Attendance:</strong> {report.actual_students_present}/{report.total_registered_students}
                </Card.Text>
                
                {user.role === 'student' ? (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Your Rating</Form.Label>
                      <div>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Button
                            key={star}
                            variant={ratings[report.id] >= star ? 'warning' : 'outline-warning'}
                            size="sm"
                            className="me-1"
                            onClick={() => handleRatingChange(report.id, star)}
                          >
                            {star} ⭐
                          </Button>
                        ))}
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Your Comment (Optional)</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={comments[report.id] || ''}
                        onChange={(e) => handleCommentChange(report.id, e.target.value)}
                        placeholder="Share your feedback about this lecture..."
                      />
                    </Form.Group>

                    <Button
                      variant="primary"
                      onClick={() => submitRating(report.id)}
                      disabled={submitting || !ratings[report.id]}
                      className="w-100"
                    >
                      {submitting ? 'Submitting...' : ratings[report.id] ? 'Update Rating' : 'Submit Rating'}
                    </Button>
                  </>
                ) : (
                  <div className="text-center">
                    <Button
                      variant="outline-info"
                      onClick={() => viewRatings(report)}
                      className="w-100"
                    >
                      View Ratings
                    </Button>
                  </div>
                )}
              </Card.Body>
              <Card.Footer>
                <small className="text-muted">
                  Week {report.week_of_reporting} • {report.venue}
                </small>
              </Card.Footer>
            </Card>
          </Col>
        ))}

        {reports.length === 0 && (
          <Col>
            <Card>
              <Card.Body className="text-center">
                <Card.Text>
                  {user.role === 'student' 
                    ? 'No reports available for rating. You might not be enrolled in any classes yet.'
                    : 'No reports available for viewing ratings.'
                  }
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>

      {/* Ratings Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Ratings for {selectedReport?.course_name} - {selectedReport?.class_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport?.ratings && selectedReport.ratings.length > 0 ? (
            <>
              <div className="text-center mb-4">
                <h4>
                  Average Rating: {getAverageRating(selectedReport.ratings)} ⭐
                </h4>
                <p>Based on {selectedReport.ratings.length} rating(s)</p>
              </div>
              
              {selectedReport.ratings.map((rating, index) => (
                <Card key={index} className="mb-3">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6>{rating.student_name}</h6>
                        <div className="mb-2">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} style={{ color: i < rating.rating_value ? '#ffc107' : '#e4e5e9' }}>
                              ⭐
                            </span>
                          ))}
                          <span className="ms-2">({rating.rating_value}/5)</span>
                        </div>
                        {rating.comment && (
                          <p className="mb-0">{rating.comment}</p>
                        )}
                      </div>
                      <small className="text-muted">
                        {new Date(rating.created_at).toLocaleDateString()}
                      </small>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </>
          ) : (
            <div className="text-center">
              <p>No ratings yet for this report.</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Rating;
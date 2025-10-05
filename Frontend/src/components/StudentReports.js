// client/src/components/StudentReports.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Container, Row, Col, Form, Button, Modal, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function StudentReports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportRatings, setReportRatings] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      if (userObj.role === 'student') {
        fetchStudentReports();
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    filterReports();
  }, [searchTerm, filterCourse, reports]);

  const fetchStudentReports = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await axios.get('http://localhost:5000/api/student/reports', {
        headers: { 'Authorization': sessionId }
      });
      setReports(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching student reports:', error);
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.topic_taught.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.lecturer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCourse) {
      filtered = filtered.filter(report => report.course_name === filterCourse);
    }

    setFilteredReports(filtered);
  };

  const getAttendancePercentage = (present, total) => {
    return total > 0 ? Math.round((present / total) * 100) : 0;
  };

  const getAttendanceBadge = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'danger';
  };

  const viewReportDetails = async (report) => {
    setSelectedReport(report);
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await axios.get(`http://localhost:5000/api/ratings/${report.id}`, {
        headers: { 'Authorization': sessionId }
      });
      setReportRatings(response.data);
    } catch (error) {
      console.error('Error fetching ratings:', error);
      setReportRatings([]);
    }
    setShowModal(true);
  };

  const getUniqueCourses = () => {
    const courses = reports.map(report => report.course_name);
    return [...new Set(courses)].filter(Boolean);
  };

  const getAverageRating = () => {
    if (!reportRatings || reportRatings.length === 0) return 0;
    const sum = reportRatings.reduce((acc, rating) => acc + rating.rating_value, 0);
    return (sum / reportRatings.length).toFixed(1);
  };

  if (loading) {
    return <div className="text-center mt-4">Loading your reports...</div>;
  }

  if (!user || user.role !== 'student') {
    return (
      <Container>
        <Alert variant="warning" className="mt-3">
          Access denied. This page is for students only.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <h1 className="mb-4">My Class Reports</h1>
      
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Search Reports</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search by course, topic, or lecturer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Filter by Course</Form.Label>
                <Form.Select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                >
                  <option value="">All Courses</option>
                  {getUniqueCourses().map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button 
                variant="outline-secondary" 
                onClick={() => { setSearchTerm(''); setFilterCourse(''); }}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>{reports.length}</Card.Title>
              <Card.Text>Total Reports</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>{getUniqueCourses().length}</Card.Title>
              <Card.Text>Courses</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                {reports.length > 0
                  ? Math.round(reports.reduce((acc, report) => 
                      acc + getAttendancePercentage(report.actual_students_present, report.total_registered_students), 0) / reports.length)
                  : 0
                }%
              </Card.Title>
              <Card.Text>Avg Attendance</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                {new Set(reports.map(report => report.lecturer_name)).size}
              </Card.Title>
              <Card.Text>Lecturers</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header>
          <h5 className="mb-0">Class Reports</h5>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Course</th>
                  <th>Class</th>
                  <th>Lecturer</th>
                  <th>Topic</th>
                  <th>Attendance</th>
                  <th>Venue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(report => (
                  <tr key={report.id}>
                    <td>{new Date(report.date_of_lecture).toLocaleDateString()}</td>
                    <td>
                      <Badge bg="primary">{report.course_code}</Badge>
                      <br />
                      <small>{report.course_name}</small>
                    </td>
                    <td>{report.class_name}</td>
                    <td>{report.lecturer_name}</td>
                    <td>
                      <div style={{ maxWidth: '200px' }}>
                        <small>{report.topic_taught.substring(0, 60)}...</small>
                      </div>
                    </td>
                    <td>
                      <Badge bg={getAttendanceBadge(getAttendancePercentage(report.actual_students_present, report.total_registered_students))}>
                        {report.actual_students_present}/{report.total_registered_students}
                      </Badge>
                    </td>
                    <td>{report.venue}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => viewReportDetails(report)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center">
                      No reports found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Report Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Report Details - {selectedReport?.course_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Class:</strong> {selectedReport.class_name}
                </Col>
                <Col md={6}>
                  <strong>Date:</strong> {new Date(selectedReport.date_of_lecture).toLocaleDateString()}
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Lecturer:</strong> {selectedReport.lecturer_name}
                </Col>
                <Col md={6}>
                  <strong>Week:</strong> {selectedReport.week_of_reporting}
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Venue:</strong> {selectedReport.venue}
                </Col>
                <Col md={6}>
                  <strong>Time:</strong> {selectedReport.scheduled_time}
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Attendance:</strong>{' '}
                  <Badge bg={getAttendanceBadge(getAttendancePercentage(selectedReport.actual_students_present, selectedReport.total_registered_students))}>
                    {selectedReport.actual_students_present}/{selectedReport.total_registered_students} 
                    ({getAttendancePercentage(selectedReport.actual_students_present, selectedReport.total_registered_students)}%)
                  </Badge>
                </Col>
                <Col md={6}>
                  <strong>Average Rating:</strong>{' '}
                  <Badge bg="info">
                    {getAverageRating()} ⭐ ({reportRatings.length} ratings)
                  </Badge>
                </Col>
              </Row>

              <hr />
              
              <h6>Topic Taught:</h6>
              <Card className="mb-3">
                <Card.Body>
                  {selectedReport.topic_taught}
                </Card.Body>
              </Card>

              <h6>Learning Outcomes:</h6>
              <Card className="mb-3">
                <Card.Body>
                  {selectedReport.learning_outcomes}
                </Card.Body>
              </Card>

              {selectedReport.lecturer_recommendations && (
                <>
                  <h6>Lecturer Recommendations:</h6>
                  <Card className="mb-3">
                    <Card.Body>
                      {selectedReport.lecturer_recommendations}
                    </Card.Body>
                  </Card>
                </>
              )}

              {/* Ratings Section */}
              <h6>Student Ratings:</h6>
              {reportRatings.length > 0 ? (
                <Card>
                  <Card.Body>
                    {reportRatings.map((rating, index) => (
                      <div key={index} className="border-bottom pb-2 mb-2">
                        <div className="d-flex justify-content-between">
                          <strong>{rating.student_name}</strong>
                          <div>
                            {[...Array(5)].map((_, i) => (
                              <span key={i} style={{ color: i < rating.rating_value ? '#ffc107' : '#e4e5e9' }}>
                                ⭐
                              </span>
                            ))}
                          </div>
                        </div>
                        {rating.comment && (
                          <p className="mb-0 mt-1">{rating.comment}</p>
                        )}
                        <small className="text-muted">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </small>
                      </div>
                    ))}
                  </Card.Body>
                </Card>
              ) : (
                <p className="text-muted">No ratings yet for this report.</p>
              )}
            </>
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

export default StudentReports;
// client/src/components/Monitoring.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Monitoring() {
  const [monitoringData, setMonitoringData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchMonitoringData();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    filterData();
  }, [searchTerm, filterCourse, monitoringData]);

  const fetchMonitoringData = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await axios.get('http://localhost:5000/api/monitoring', {
        headers: { 'Authorization': sessionId }
      });
      setMonitoringData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = monitoringData;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.topic_taught?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCourse) {
      filtered = filtered.filter(item => item.course_name === filterCourse);
    }

    setFilteredData(filtered);
  };

  const getAttendancePercentage = (present, total) => {
    return total > 0 ? Math.round((present / total) * 100) : 0;
  };

  const getAttendanceBadge = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'danger';
  };

  const getRatingBadge = (rating) => {
    if (!rating && rating !== 0) return 'secondary';
    const numRating = Number(rating);
    if (numRating >= 4) return 'success';
    if (numRating >= 3) return 'warning';
    return 'danger';
  };

  const getUniqueCourses = () => {
    const courses = monitoringData.map(item => item.course_name).filter(Boolean);
    return [...new Set(courses)];
  };

  // Safe function to format rating
  const formatRating = (rating) => {
    if (rating === null || rating === undefined || isNaN(rating)) return 'N/A';
    return Number(rating).toFixed(1);
  };

  // Safe function to check rating conditions
  const getStatusBadge = (report) => {
    const rating = report.average_rating;
    const attendancePercentage = getAttendancePercentage(
      report.actual_students_present, 
      report.total_registered_students
    );

    // If no rating data, show neutral status
    if (!rating && rating !== 0) {
      return <Badge bg="secondary">No Ratings</Badge>;
    }

    const numRating = Number(rating);
    
    if (numRating >= 4 && attendancePercentage >= 80) {
      return <Badge bg="success">Excellent</Badge>;
    } else if (numRating >= 3 && attendancePercentage >= 60) {
      return <Badge bg="warning">Good</Badge>;
    } else {
      return <Badge bg="danger">Needs Attention</Badge>;
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="text-center mt-5">
          <i className="bi bi-graph-up display-1 text-primary"></i>
          <h4 className="mt-3">Loading monitoring data...</h4>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container>
        <Alert variant="warning" className="mt-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Please log in to access monitoring.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex align-items-center mb-4">
        <i className="bi bi-graph-up display-4 text-primary me-3"></i>
        <div>
          <h1 className="mb-0">Monitoring Dashboard</h1>
          <p className="text-muted">Track and analyze academic performance</p>
        </div>
      </div>

      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">
            <i className="bi bi-funnel me-2"></i>
            Filters & Search
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  <i className="bi bi-search me-1"></i>
                  Search
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search by course, class, or topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  <i className="bi bi-filter me-1"></i>
                  Filter by Course
                </Form.Label>
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
                <i className="bi bi-arrow-clockwise me-1"></i>
                Clear
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center border-primary">
            <Card.Body>
              <i className="bi bi-file-text display-6 text-primary mb-2"></i>
              <Card.Title className="h2">{filteredData.length}</Card.Title>
              <Card.Text className="text-muted">Total Reports</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-warning">
            <Card.Body>
              <i className="bi bi-star display-6 text-warning mb-2"></i>
              <Card.Title className="h2">
                {monitoringData.length > 0 
                  ? formatRating(monitoringData.reduce((acc, item) => {
                      const rating = item.average_rating;
                      return acc + (rating && !isNaN(rating) ? Number(rating) : 0);
                    }, 0) / monitoringData.length)
                  : '0.0'
                }
              </Card.Title>
              <Card.Text className="text-muted">Average Rating</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-success">
            <Card.Body>
              <i className="bi bi-people display-6 text-success mb-2"></i>
              <Card.Title className="h2">
                {monitoringData.length > 0
                  ? Math.round(monitoringData.reduce((acc, item) => 
                      acc + getAttendancePercentage(item.actual_students_present, item.total_registered_students), 0) / monitoringData.length)
                  : 0
                }%
              </Card.Title>
              <Card.Text className="text-muted">Avg Attendance</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-info">
            <Card.Body>
              <i className="bi bi-book display-6 text-info mb-2"></i>
              <Card.Title className="h2">
                {getUniqueCourses().length}
              </Card.Title>
              <Card.Text className="text-muted">Courses</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header className="bg-light">
          <h5 className="mb-0">
            <i className="bi bi-table me-2"></i>
            Detailed Monitoring
          </h5>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th><i className="bi bi-calendar me-1"></i>Date</th>
                  <th><i className="bi bi-book me-1"></i>Course</th>
                  <th><i className="bi bi-list-ul me-1"></i>Class</th>
                  <th><i className="bi bi-journal-text me-1"></i>Topic</th>
                  <th><i className="bi bi-person-badge me-1"></i>Lecturer</th>
                  <th><i className="bi bi-people me-1"></i>Attendance</th>
                  <th><i className="bi bi-star me-1"></i>Rating</th>
                  <th><i className="bi bi-graph-up me-1"></i>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(report => (
                  <tr key={report.id}>
                    <td>{report.date_of_lecture ? new Date(report.date_of_lecture).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <Badge bg="primary">{report.course_code || 'N/A'}</Badge>
                      <br />
                      <small>{report.course_name || 'Unknown Course'}</small>
                    </td>
                    <td>{report.class_name || 'N/A'}</td>
                    <td>
                      <div style={{ maxWidth: '200px' }}>
                        <small>{(report.topic_taught || 'No topic specified').substring(0, 50)}...</small>
                      </div>
                    </td>
                    <td>{report.lecturer_name || 'Unknown Lecturer'}</td>
                    <td>
                      <Badge bg={getAttendanceBadge(getAttendancePercentage(report.actual_students_present, report.total_registered_students))}>
                        {report.actual_students_present || 0}/{report.total_registered_students || 0} 
                        ({getAttendancePercentage(report.actual_students_present, report.total_registered_students)}%)
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={getRatingBadge(report.average_rating)}>
                        {formatRating(report.average_rating)} 
                        {report.rating_count > 0 && ` (${report.rating_count})`}
                      </Badge>
                    </td>
                    <td>
                      {getStatusBadge(report)}
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <i className="bi bi-inbox display-4 text-muted mb-3"></i>
                      <h5 className="text-muted">
                        {monitoringData.length === 0 ? 'No monitoring data available' : 'No data matches your filters'}
                      </h5>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Additional Charts Section */}
      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">
            <i className="bi bi-bar-chart me-2"></i>
            Performance Overview
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <div className="text-center p-4 border rounded">
                <i className="bi bi-pie-chart display-4 text-primary mb-3"></i>
                <h6>Attendance Distribution</h6>
                <p className="text-muted">Chart would be displayed here</p>
                <small>Showing attendance patterns across all classes</small>
              </div>
            </Col>
            <Col md={6}>
              <div className="text-center p-4 border rounded">
                <i className="bi bi-graph-up-arrow display-4 text-success mb-3"></i>
                <h6>Rating Trends</h6>
                <p className="text-muted">Chart would be displayed here</p>
                <small>Showing rating trends over time</small>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Monitoring;
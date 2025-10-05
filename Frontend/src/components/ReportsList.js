// client/src/components/ReportsList.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Container, Row, Col, Form, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function ReportsList() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      fetchReports();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    filterReports();
  }, [searchTerm, reports]);

  const fetchReports = async () => {
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

  const filterReports = () => {
    if (!searchTerm) {
      setFilteredReports(reports);
      return;
    }

    const filtered = reports.filter(report =>
      report.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.topic_taught.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredReports(filtered);
  };

  const handleExport = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      const response = await axios.get('http://localhost:5000/api/reports/export', {
        responseType: 'blob',
        headers: { 'Authorization': sessionId }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reports.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting reports:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-4">
        <i className="bi bi-arrow-repeat fs-1 text-primary"></i>
        <p className="mt-2">Loading reports...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Container>
        <Alert variant="warning" className="mt-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Please log in to access reports.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>
            <i className="bi bi-files me-2"></i>
            Reports
          </h1>
        </Col>
        <Col xs="auto">
          {user.role === 'lecturer' && (
            <Button as={Link} to="/reports/new" variant="primary">
              <i className="bi bi-plus-circle me-2"></i>
              New Report
            </Button>
          )}
          <Button variant="success" className="ms-2" onClick={handleExport}>
            <i className="bi bi-download me-2"></i>
            Export to Excel
          </Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th><i className="bi bi-people me-1"></i>Class</th>
                  <th><i className="bi bi-book me-1"></i>Course</th>
                  <th><i className="bi bi-calendar-week me-1"></i>Week</th>
                  <th><i className="bi bi-calendar me-1"></i>Date</th>
                  <th><i className="bi bi-person-check me-1"></i>Students Present</th>
                  <th><i className="bi bi-geo-alt me-1"></i>Venue</th>
                  <th><i className="bi bi-journal-text me-1"></i>Topic</th>
                  <th><i className="bi bi-person me-1"></i>Lecturer</th>
                  <th><i className="bi bi-gear me-1"></i>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(report => (
                  <tr key={report.id}>
                    <td>{report.class_name}</td>
                    <td>
                      <Badge bg="secondary">
                        {report.course_code}
                      </Badge>
                    </td>
                    <td>{report.week_of_reporting}</td>
                    <td>
                      <i className="bi bi-calendar me-1 text-muted"></i>
                      {new Date(report.date_of_lecture).toLocaleDateString()}
                    </td>
                    <td>
                      <Badge 
                        bg={
                          report.actual_students_present / report.total_registered_students > 0.7 
                            ? 'success' 
                            : report.actual_students_present / report.total_registered_students > 0.5 
                            ? 'warning' 
                            : 'danger'
                        }
                      >
                        <i className="bi bi-people me-1"></i>
                        {report.actual_students_present}/{report.total_registered_students}
                      </Badge>
                    </td>
                    <td>{report.venue}</td>
                    <td>{report.topic_taught.substring(0, 50)}...</td>
                    <td>{report.lecturer_name}</td>
                    <td>
                      <Button variant="outline-primary" size="sm">
                        <i className="bi bi-eye me-1"></i>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center">
                      <i className="bi bi-inbox fs-1 text-muted"></i>
                      <p className="mt-2">No reports found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default ReportsList;
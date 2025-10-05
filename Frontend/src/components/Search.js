// client/src/components/Search.js
import React, { useState } from 'react';
import { Card, Form, Button, Table, Badge, Container, Row, Col } from 'react-bootstrap';
import axios from 'axios';

function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/search', {
        params: {
          q: searchTerm,
          type: searchType
        }
      });
      setResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
    }
    setLoading(false);
  };

  return (
    <Container>
      <h1 className="mb-4">Search</h1>
      
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Search Term</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter search term..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Search Type</Form.Label>
                  <Form.Select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="reports">Reports</option>
                    <option value="courses">Courses</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="w-100"
                  disabled={loading}
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {results.length > 0 && (
        <Card>
          <Card.Body>
            <h5>Search Results ({results.length})</h5>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name/Title</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td>
                      <Badge bg={result.type === 'report' ? 'info' : 'success'}>
                        {result.type}
                      </Badge>
                    </td>
                    <td>
                      {result.type === 'report' 
                        ? `${result.class_name} - ${result.topic_taught.substring(0, 50)}...`
                        : `${result.code} - ${result.name}`
                      }
                    </td>
                    <td>
                      {result.type === 'report' 
                        ? `Date: ${new Date(result.date_of_lecture).toLocaleDateString()} | Students: ${result.actual_students_present}`
                        : `Faculty: ${result.faculty_name}`
                      }
                    </td>
                    <td>
                      <Button variant="outline-primary" size="sm">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default Search;
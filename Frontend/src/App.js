// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ReportForm from './components/ReportForm';
import ReportsList from './components/ReportsList';
import Classes from './components/Classes';
import Courses from './components/Courses';
import Search from './components/Search';
import Monitoring from './components/Monitoring';
import Rating from './components/Rating';
import Feedback from './components/Feedback';
import StudentReports from './components/StudentReports';
import 'bootstrap-icons/font/bootstrap-icons.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Container fluid className="mt-4">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reports" element={<ReportsList />} />
            <Route path="/reports/new" element={<ReportForm />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/search" element={<Search />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/rating" element={<Rating />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/student-reports" element={<StudentReports />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Container>
      </div>
    </Router>
  );
}

export default App;
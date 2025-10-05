// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const ExcelJS = require('exceljs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'canary@qzx',
  database: process.env.DB_NAME || 'luct_reporting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Simple session storage (in production, use Redis or database sessions)
const userSessions = new Map();

// Authentication middleware - modified to use session-based auth
const authenticateUser = async (req, res, next) => {
  const sessionId = req.headers['authorization'] || req.headers['session-id'];

  if (!sessionId) {
    return res.status(401).json({ error: 'Session ID required' });
  }

  const userSession = userSessions.get(sessionId);
  if (!userSession) {
    return res.status(403).json({ error: 'Invalid or expired session' });
  }

  // Verify user still exists in database
  try {
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userSession.id]);
    if (users.length === 0) {
      userSessions.delete(sessionId);
      return res.status(403).json({ error: 'User no longer exists' });
    }

    req.user = userSession;
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to generate session ID
function generateSessionId() {
  return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// ==================== DATABASE INITIALIZATION ====================

// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'lecturer', 'principal_lecturer', 'program_leader') NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create faculties table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS faculties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create courses table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        faculty_id INT NOT NULL,
        program_leader_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES faculties(id),
        FOREIGN KEY (program_leader_id) REFERENCES users(id)
      )
    `);

    // Create classes table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        course_id INT NOT NULL,
        lecturer_id INT NOT NULL,
        total_registered_students INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (lecturer_id) REFERENCES users(id)
      )
    `);

    // Create student_enrollments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS student_enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        class_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (class_id) REFERENCES classes(id),
        UNIQUE KEY unique_enrollment (student_id, class_id)
      )
    `);

    // Create reports table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_name VARCHAR(255) NOT NULL,
        class_id INT NOT NULL,
        week_of_reporting VARCHAR(50) NOT NULL,
        date_of_lecture DATE NOT NULL,
        course_name VARCHAR(255) NOT NULL,
        course_code VARCHAR(50) NOT NULL,
        lecturer_name VARCHAR(100) NOT NULL,
        actual_students_present INT NOT NULL,
        total_registered_students INT NOT NULL,
        venue VARCHAR(100) NOT NULL,
        scheduled_time TIME NOT NULL,
        topic_taught TEXT NOT NULL,
        learning_outcomes TEXT NOT NULL,
        lecturer_recommendations TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Create ratings table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL,
        student_id INT NOT NULL,
        rating_value INT CHECK (rating_value >= 1 AND rating_value <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES reports(id),
        FOREIGN KEY (student_id) REFERENCES users(id),
        UNIQUE KEY unique_rating (report_id, student_id)
      )
    `);

    // Create feedback table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL,
        principal_lecturer_id INT NOT NULL,
        feedback_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES reports(id),
        FOREIGN KEY (principal_lecturer_id) REFERENCES users(id)
      )
    `);

    // Create course_assignments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS course_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        lecturer_id INT NOT NULL,
        assigned_by INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (lecturer_id) REFERENCES users(id),
        FOREIGN KEY (assigned_by) REFERENCES users(id)
      )
    `);

    // Insert default faculties
    await pool.execute(`
      INSERT IGNORE INTO faculties (id, name) VALUES 
      (1, 'Faculty of Information Communication Technology'),
      (2, 'Faculty of Business'),
      (3, 'Faculty of Engineering')
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'LUCT Reporting System API is running' });
});

// Auth routes - modified to use sessions
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role, fullName } = req.body;
    
    if (!username || !email || !password || !role || !fullName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, role, fullName]
    );
    
    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });
    
    // Create session
    const sessionId = generateSessionId();
    const userSession = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    };
    
    userSessions.set(sessionId, userSession);
    
    res.json({
      sessionId,
      user: userSession
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.headers['authorization'] || req.headers['session-id'];
  
  if (sessionId && userSessions.has(sessionId)) {
    userSessions.delete(sessionId);
  }
  
  res.json({ message: 'Logged out successfully' });
});

// ==================== COURSES ENDPOINTS ====================

// Get all courses
app.get('/api/courses', authenticateUser, async (req, res) => {
  try {
    const { role, id } = req.user;
    
    let query = `
      SELECT c.*, f.name as faculty_name, u.full_name as program_leader_name
      FROM courses c
      JOIN faculties f ON c.faculty_id = f.id
      LEFT JOIN users u ON c.program_leader_id = u.id
    `;
    
    let params = [];
    
    if (role === 'principal_lecturer') {
      query += ' WHERE c.program_leader_id = ?';
      params = [id];
    }
    
    const [courses] = await pool.execute(query, params);
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Create new course
app.post('/api/courses', authenticateUser, async (req, res) => {
  try {
    const { code, name, facultyId } = req.body;
    
    if (req.user.role !== 'program_leader') {
      return res.status(403).json({ error: 'Access denied. Only program leaders can create courses.' });
    }
    
    if (!code || !name || !facultyId) {
      return res.status(400).json({ error: 'Course code, name, and faculty are required' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO courses (code, name, faculty_id, program_leader_id) VALUES (?, ?, ?, ?)',
      [code, name, facultyId, req.user.id]
    );
    
    res.status(201).json({ 
      message: 'Course created successfully', 
      courseId: result.insertId 
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Get faculties
app.get('/api/faculties', authenticateUser, async (req, res) => {
  try {
    const [faculties] = await pool.execute('SELECT * FROM faculties');
    res.json(faculties);
  } catch (error) {
    console.error('Get faculties error:', error);
    res.status(500).json({ error: 'Failed to fetch faculties' });
  }
});

// ==================== LECTURER MODULES ====================

// Reports - Lecturers can create and view their reports
app.get('/api/reports', authenticateUser, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = `
      SELECT r.*, c.name as class_name
      FROM reports r
      JOIN classes c ON r.class_id = c.id
    `;
    let params = [];
    
    if (role === 'lecturer') {
      query += ' WHERE r.created_by = ?';
      params = [id];
    } else if (role === 'principal_lecturer') {
      query += ' WHERE r.faculty_name IN (SELECT f.name FROM faculties f JOIN courses co ON f.id = co.faculty_id WHERE co.program_leader_id = ?)';
      params = [id];
    }
    
    query += ' ORDER BY r.created_at DESC';
    const [reports] = await pool.execute(query, params);
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.post('/api/reports', authenticateUser, async (req, res) => {
  try {
    const {
      facultyName, className, weekOfReporting, dateOfLecture, courseName,
      courseCode, lecturerName, actualStudentsPresent, totalRegisteredStudents,
      venue, scheduledTime, topicTaught, learningOutcomes, lecturerRecommendations, classId
    } = req.body;
    
    if (!facultyName || !className || !weekOfReporting || !dateOfLecture || !courseName || 
        !courseCode || !lecturerName || !actualStudentsPresent || !totalRegisteredStudents ||
        !venue || !scheduledTime || !topicTaught || !learningOutcomes) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }
    
    const [result] = await pool.execute(
      `INSERT INTO reports 
       (faculty_name, class_id, week_of_reporting, date_of_lecture, course_name, course_code,
        lecturer_name, actual_students_present, total_registered_students, venue, scheduled_time,
        topic_taught, learning_outcomes, lecturer_recommendations, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [facultyName, classId, weekOfReporting, dateOfLecture, courseName, courseCode,
       lecturerName, actualStudentsPresent, totalRegisteredStudents, venue, scheduledTime,
       topicTaught, learningOutcomes, lecturerRecommendations, req.user.id]
    );
    
    res.status(201).json({ message: 'Report created successfully', reportId: result.insertId });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Classes - Lecturers can view their classes
app.get('/api/classes', authenticateUser, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = `
      SELECT c.*, co.name as course_name, co.code as course_code, f.name as faculty_name
      FROM classes c
      JOIN courses co ON c.course_id = co.id
      JOIN faculties f ON co.faculty_id = f.id
    `;
    let params = [];
    
    if (role === 'lecturer') {
      query += ' WHERE c.lecturer_id = ?';
      params = [id];
    } else if (role === 'student') {
      query += ' JOIN student_enrollments se ON c.id = se.class_id WHERE se.student_id = ?';
      params = [id];
    }
    
    const [classes] = await pool.execute(query, params);
    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// ==================== STUDENT MODULES ====================

// Monitoring - Students can view reports for their classes
app.get('/api/student/reports', authenticateUser, async (req, res) => {
  try {
    const { id } = req.user;
    
    const [reports] = await pool.execute(
      `SELECT r.*, c.name as class_name 
       FROM reports r 
       JOIN classes c ON r.class_id = c.id 
       JOIN student_enrollments se ON c.id = se.class_id 
       WHERE se.student_id = ? 
       ORDER BY r.created_at DESC`,
      [id]
    );
    
    res.json(reports);
  } catch (error) {
    console.error('Get student reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Rating - Students can rate reports
app.post('/api/ratings', authenticateUser, async (req, res) => {
  try {
    const { reportId, ratingValue, comment } = req.body;
    
    if (!reportId || !ratingValue) {
      return res.status(400).json({ error: 'Report ID and rating value are required' });
    }
    
    if (ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if student is enrolled in the class
    const [enrollments] = await pool.execute(
      `SELECT se.id FROM student_enrollments se 
       JOIN reports r ON se.class_id = r.class_id 
       WHERE se.student_id = ? AND r.id = ?`,
      [req.user.id, reportId]
    );
    
    if (enrollments.length === 0) {
      return res.status(403).json({ error: 'You can only rate reports for classes you are enrolled in' });
    }
    
    // Check if already rated
    const [existingRatings] = await pool.execute(
      'SELECT id FROM ratings WHERE report_id = ? AND student_id = ?',
      [reportId, req.user.id]
    );
    
    if (existingRatings.length > 0) {
      // Update existing rating
      await pool.execute(
        'UPDATE ratings SET rating_value = ?, comment = ? WHERE report_id = ? AND student_id = ?',
        [ratingValue, comment, reportId, req.user.id]
      );
      res.json({ message: 'Rating updated successfully' });
    } else {
      // Create new rating
      await pool.execute(
        'INSERT INTO ratings (report_id, student_id, rating_value, comment) VALUES (?, ?, ?, ?)',
        [reportId, req.user.id, ratingValue, comment]
      );
      res.status(201).json({ message: 'Rating submitted successfully' });
    }
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

app.get('/api/ratings/:reportId', authenticateUser, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const [ratings] = await pool.execute(
      `SELECT r.rating_value, r.comment, r.created_at, u.full_name as student_name
       FROM ratings r
       JOIN users u ON r.student_id = u.id
       WHERE r.report_id = ?`,
      [reportId]
    );
    
    res.json(ratings);
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// ==================== PRINCIPAL LECTURER MODULES ====================

// Courses - PRL can view courses under their stream
app.get('/api/principal/courses', authenticateUser, async (req, res) => {
  try {
    const { id } = req.user;
    
    const [courses] = await pool.execute(
      `SELECT c.*, f.name as faculty_name, u.full_name as program_leader_name,
              COUNT(DISTINCT cls.id) as class_count,
              COUNT(DISTINCT u2.id) as lecturer_count
       FROM courses c
       JOIN faculties f ON c.faculty_id = f.id
       LEFT JOIN users u ON c.program_leader_id = u.id
       LEFT JOIN classes cls ON c.id = cls.course_id
       LEFT JOIN users u2 ON cls.lecturer_id = u2.id
       WHERE c.program_leader_id = ?
       GROUP BY c.id`,
      [id]
    );
    
    res.json(courses);
  } catch (error) {
    console.error('Get principal courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Feedback - PRL can add feedback to reports
app.post('/api/feedback', authenticateUser, async (req, res) => {
  try {
    const { reportId, feedbackText } = req.body;
    
    if (!reportId || !feedbackText) {
      return res.status(400).json({ error: 'Report ID and feedback text are required' });
    }
    
    await pool.execute(
      'INSERT INTO feedback (report_id, principal_lecturer_id, feedback_text) VALUES (?, ?, ?)',
      [reportId, req.user.id, feedbackText]
    );
    
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

app.get('/api/feedback/:reportId', authenticateUser, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const [feedback] = await pool.execute(
      `SELECT f.*, u.full_name as principal_lecturer_name
       FROM feedback f
       JOIN users u ON f.principal_lecturer_id = u.id
       WHERE f.report_id = ?`,
      [reportId]
    );
    
    res.json(feedback);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// ==================== PROGRAM LEADER MODULES ====================

// Courses - PL can add and manage courses
app.get('/api/program/courses', authenticateUser, async (req, res) => {
  try {
    const [courses] = await pool.execute(
      `SELECT c.*, f.name as faculty_name, u.full_name as program_leader_name,
              COUNT(DISTINCT cls.id) as class_count
       FROM courses c
       JOIN faculties f ON c.faculty_id = f.id
       LEFT JOIN users u ON c.program_leader_id = u.id
       LEFT JOIN classes cls ON c.id = cls.course_id
       GROUP BY c.id`
    );
    
    res.json(courses);
  } catch (error) {
    console.error('Get program courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

app.post('/api/program/courses', authenticateUser, async (req, res) => {
  try {
    const { code, name, facultyId } = req.body;
    
    if (req.user.role !== 'program_leader') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!code || !name || !facultyId) {
      return res.status(400).json({ error: 'Course code, name, and faculty are required' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO courses (code, name, faculty_id, program_leader_id) VALUES (?, ?, ?, ?)',
      [code, name, facultyId, req.user.id]
    );
    
    res.status(201).json({ message: 'Course created successfully', courseId: result.insertId });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Assign lecturers to courses
app.post('/api/program/assign-lecturer', authenticateUser, async (req, res) => {
  try {
    const { courseId, lecturerId } = req.body;
    
    if (req.user.role !== 'program_leader') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!courseId || !lecturerId) {
      return res.status(400).json({ error: 'Course ID and Lecturer ID are required' });
    }
    
    await pool.execute(
      'INSERT INTO course_assignments (course_id, lecturer_id, assigned_by) VALUES (?, ?, ?)',
      [courseId, lecturerId, req.user.id]
    );
    
    res.status(201).json({ message: 'Lecturer assigned successfully' });
  } catch (error) {
    console.error('Assign lecturer error:', error);
    res.status(500).json({ error: 'Failed to assign lecturer' });
  }
});

// Get lecturers for assignment
app.get('/api/program/lecturers', authenticateUser, async (req, res) => {
  try {
    const [lecturers] = await pool.execute(
      'SELECT id, full_name, email FROM users WHERE role = "lecturer"'
    );
    
    res.json(lecturers);
  } catch (error) {
    console.error('Get lecturers error:', error);
    res.status(500).json({ error: 'Failed to fetch lecturers' });
  }
});

// Monitoring - All roles can access monitoring
app.get('/api/monitoring', authenticateUser, async (req, res) => {
  try {
    const { role, id } = req.user;
    
    let query = `
      SELECT r.*, c.name as class_name, co.name as course_name,
             AVG(rat.rating_value) as average_rating,
             COUNT(rat.id) as rating_count
      FROM reports r
      JOIN classes c ON r.class_id = c.id
      JOIN courses co ON c.course_id = co.id
      LEFT JOIN ratings rat ON r.id = rat.report_id
    `;
    let params = [];
    
    if (role === 'lecturer') {
      query += ' WHERE r.created_by = ?';
      params = [id];
    } else if (role === 'student') {
      query += ' JOIN student_enrollments se ON c.id = se.class_id WHERE se.student_id = ?';
      params = [id];
    } else if (role === 'principal_lecturer') {
      query += ' WHERE co.program_leader_id = ?';
      params = [id];
    }
    
    query += ' GROUP BY r.id ORDER BY r.created_at DESC';
    
    const [monitoringData] = await pool.execute(query, params);
    res.json(monitoringData);
  } catch (error) {
    console.error('Monitoring error:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring data' });
  }
});

// Export functionality
app.get('/api/reports/export', authenticateUser, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = `SELECT r.*, c.name as class_name FROM reports r JOIN classes c ON r.class_id = c.id`;
    let params = [];
    
    if (role === 'lecturer') {
      query += ' WHERE r.created_by = ?';
      params = [id];
    } else if (role === 'principal_lecturer') {
      query += ' WHERE r.faculty_name IN (SELECT f.name FROM faculties f JOIN courses co ON f.id = co.faculty_id WHERE co.program_leader_id = ?)';
      params = [id];
    }
    
    const [reports] = await pool.execute(query, params);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reports');
    
    worksheet.columns = [
      { header: 'Faculty', key: 'faculty_name', width: 20 },
      { header: 'Class', key: 'class_name', width: 15 },
      { header: 'Week', key: 'week_of_reporting', width: 10 },
      { header: 'Date', key: 'date_of_lecture', width: 12 },
      { header: 'Course', key: 'course_name', width: 20 },
      { header: 'Code', key: 'course_code', width: 15 },
      { header: 'Lecturer', key: 'lecturer_name', width: 20 },
      { header: 'Students Present', key: 'actual_students_present', width: 15 },
      { header: 'Total Students', key: 'total_registered_students', width: 15 },
      { header: 'Venue', key: 'venue', width: 15 },
      { header: 'Time', key: 'scheduled_time', width: 12 },
      { header: 'Topic', key: 'topic_taught', width: 25 }
    ];
    
    reports.forEach(report => {
      worksheet.addRow({
        faculty_name: report.faculty_name,
        class_name: report.class_name,
        week_of_reporting: report.week_of_reporting,
        date_of_lecture: report.date_of_lecture,
        course_name: report.course_name,
        course_code: report.course_code,
        lecturer_name: report.lecturer_name,
        actual_students_present: report.actual_students_present,
        total_registered_students: report.total_registered_students,
        venue: report.venue,
        scheduled_time: report.scheduled_time,
        topic_taught: report.topic_taught
      });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reports.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export reports' });
  }
});

// Search functionality
app.get('/api/search', authenticateUser, async (req, res) => {
  try {
    const { q, type } = req.query;
    const { role, id } = req.user;
    
    if (!q) return res.status(400).json({ error: 'Search query required' });
    
    let results = [];
    const searchTerm = `%${q}%`;
    
    if (type === 'reports' || !type) {
      let reportQuery = `SELECT r.*, c.name as class_name FROM reports r JOIN classes c ON r.class_id = c.id 
                        WHERE (r.course_name LIKE ? OR r.course_code LIKE ? OR r.topic_taught LIKE ? OR r.lecturer_name LIKE ?)`;
      let reportParams = [searchTerm, searchTerm, searchTerm, searchTerm];
      
      if (role === 'lecturer') {
        reportQuery += ' AND r.created_by = ?';
        reportParams.push(id);
      } else if (role === 'student') {
        reportQuery += ' AND c.id IN (SELECT class_id FROM student_enrollments WHERE student_id = ?)';
        reportParams.push(id);
      } else if (role === 'principal_lecturer') {
        reportQuery += ' AND r.faculty_name IN (SELECT f.name FROM faculties f JOIN courses co ON f.id = co.faculty_id WHERE co.program_leader_id = ?)';
        reportParams.push(id);
      }
      
      const [reportResults] = await pool.execute(reportQuery, reportParams);
      results = results.concat(reportResults.map(r => ({ ...r, type: 'report' })));
    }
    
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize server
async function startServer() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    
    // Initialize database tables
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 LUCT Reporting System API is ready`);
      console.log(`🔗 Available endpoints:`);
      console.log(`   POST /api/auth/register - User registration`);
      console.log(`   POST /api/auth/login - User login`);
      console.log(`   POST /api/auth/logout - User logout`);
      console.log(`   GET  /api/courses - Get courses`);
      console.log(`   POST /api/courses - Create course (program leaders only)`);
      console.log(`   GET  /api/reports - Get reports`);
      console.log(`   POST /api/reports - Create report`);
      console.log(`   GET  /api/classes - Get classes`);
      console.log(`   GET  /api/monitoring - Get monitoring data`);
      console.log(`   And many more...`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

startServer().catch(console.error);
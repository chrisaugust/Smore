require('dotenv').config();
const path = require('path')
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // invalid token

    req.user = user;
    next();
  });
};

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, './smore-frontend/build')))

// Create new user
app.post('/api/v1/users/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // make sure email isn't already in use
    const emailCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashedPassword]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.rows[0].id, email: newUser.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: newUser.rows[0],
      
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: 'Server error: user not registered'
    });
  }
});

// Login user
app.post('/api/v1/users/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (checkUser.rows.length === 0) {
      return res.status(400).json({
        message: 'Email not found',
      });
    }

    const user = checkUser.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({
        message: 'Invalid password',
      });
    }
 
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.log('Error during login:', err);
    res.status(500).json({
      message: 'Sever error',
    });
  }
});

// Get all projects for logged-in user
app.get('/api/v1/projects', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const query = 'SELECT id, name FROM projects WHERE user_id = $1'; 
    const result = await pool.query(query, [userId]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new project for logged-in user
app.post('/api/v1/projects', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  const user_id = req.user.id;

  try {
    const query = 'INSERT INTO projects (name, description, user_id) VALUES ($1, $2, $3) RETURNING *;';
    const values = [name, description, user_id];
    const result = await pool.query(query, values);

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (err) {
    console.log('Error adding project', err);
    res.status(500).json({ error: 'Internal server error; project not added' });
  }
});

// Get specific project
app.get('/api/v1/projects/:projectId', authenticateToken, async (req, res) => {
 
  try {
    const { projectId } = req.params;
    const query = 'SELECT * FROM projects WHERE id = $1';
    const result = await pool.query(query, [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a project
app.put('/api/v1/projects/:projectId', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { name, description, status } = req.body;
  const userId = req.user.id;

  try {
    const query = `UPDATE projects 
                   SET name = $1, 
                   description = $2, 
                   status = $3 
                   WHERE id = $4 
                   AND user_id = $5 
                   RETURNING *`;
    const values = [name, description, status, projectId, userId];
    console.log(query, values);
    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: 'Project not updated',
    });
  }
});

// Delete a project
app.delete('/api/v1/projects/:projectId', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  console.log(projectId);

  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [projectId]);
    if (result.rows.length === 0 ) {
      return res.status(404).json({ error: 'Project not found!' });
    }

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error: could not delete project' });
  }
});

// Get all work sessions for a project
app.get('/api/v1/projects/:projectId/workSessions', authenticateToken, async (req, res) => {
  const { projectId } = req.params; // Access project_id from the route parameter

  try {
    const query = `
      SELECT 
        id,
        start_time,
        end_time,
        duration,
        notes,
        date,
        SUM(duration) OVER () AS total_duration
      FROM work_sessions 
      WHERE project_id = $1
      ORDER BY date ASC
    `;

    const result = await pool.query(query, [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No work sessions found' });
    }
    const totalDuration = result.rows[0].total_duration;

    res.status(200).json({
      status: 'success',
      work_sessions: result.rows,
      total_duration: totalDuration,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get one work session
app.get('/api/v1/projects/:projectId/workSessions/:workSessionId', async (req, res) => {
  const { projectId, workSessionId } = req.params;

  try {
    const result = await pool.query('SELECT * FROM work_sessions WHERE project_id = $1 and id = $2', 
                                    [projectId, workSessionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work session not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error: could not get work session' });
  }
});

// Create a work session
app.post('/api/v1/projects/:projectId/workSessions', authenticateToken, async (req, res) => {
  try {
    const { start_time, end_time, duration, notes } = req.body;
    const { projectId } = req.params;
    const user_id = req.user.id
    const date = new Date();

    const query = `
      INSERT INTO work_sessions (
        start_time, 
        end_time, 
        duration, 
        notes, 
        user_id, 
        project_id,
        date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *;        
    `;

    const values = [start_time, end_time, duration, notes, user_id, projectId, date];
    const result = await pool.query(query, values);

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// Update a work session
app.put('/api/v1/projects/:projectId/workSessions/:workSessionId', authenticateToken, async (req, res) => {
  const { projectId, workSessionId } = req.params;
  const { start_time, end_time, duration, notes, date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE work_sessions
       SET start_time = $1, end_time = $2, duration = $3, notes = $4, date = $5
       WHERE project_id = $6 AND id = $7
       RETURNING *`,
      [start_time, end_time, duration, notes, date, projectId, workSessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work session not found' });
    }

    res.status(200).json({
      message: 'Work session updated successfully',
      work_session: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating work session:', err);
    res.status(500).json({ error: 'Internal server error: could not update work session' });
  }
});

// Delete a work session
app.delete('/api/v1/projects/:projectId/workSessions/:workSessionId', authenticateToken, async (req, res) => {
  const { workSessionId } = req.params;

  try {
    const result = await pool.query('DELETE FROM work_sessions WHERE id = $1 RETURNING *', [workSessionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work session not found' });
    }
    res.status(200).json({message: 'Work session deleted' });
  } catch (err) {
    console.error('Error deleting work session:', err);
    res.status(500).json({ error: 'Internal server error: could not delete work session' });
  }
});

// After defining your routes, anything that doesn't match what's above, we want to return index.html from our built React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/../client/build/index.html'))
});


const port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port, () => {
  console.log(`Server up and listening on port ${port}`);
});


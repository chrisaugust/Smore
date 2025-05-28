/**
 * Database setup for integration tests
 * This script creates the necessary tables and seed data in the test database
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Connection to the test database
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'smore_test',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

/**
 * Setup test database tables
 */
const setupTestDatabase = async () => {
  try {
    console.log('Setting up test database...');
    
    // Drop existing tables if they exist (in reverse order to handle foreign keys)
    await pool.query('DROP TABLE IF EXISTS work_sessions CASCADE;');
    await pool.query('DROP TABLE IF EXISTS projects CASCADE;');
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create work_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_sessions (
        id SERIAL PRIMARY KEY,
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        duration INTEGER NOT NULL,
        notes TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database tables created successfully');
    return true;
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
};

/**
 * Seed test data for integration tests
 */
const seedTestData = async () => {
  try {
    console.log('Seeding test data...');
    
    // Clear existing test data
    await pool.query('DELETE FROM work_sessions');
    await pool.query('DELETE FROM projects');
    await pool.query('DELETE FROM users');


    // Hash known password
    const plain = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(plain, salt);
    
    // Insert test users with hashed passwords
    const testUsers = [
      {
        username: 'testuser',
        email: 'test@example.com',
        password: hashed
      },
      {
        username: 'anotheruser',
        email: 'another@example.com',
        password: hashed
      }
    ];

    // Insert users and get their IDs
    const userIds = await Promise.all(testUsers.map(async (user) => {
      const result = await pool.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
        [user.username, user.email, user.password]
      );
      return result.rows[0].id;
    }));

    // Insert test projects
    const testProjects = [
      {
        name: 'Test Project 1',
        description: 'This is the first test project',
        user_id: userIds[0]
      },
      {
        name: 'Test Project 2',
        description: 'This is the second test project',
        user_id: userIds[0]
      },
      {
        name: 'Another Project',
        description: 'This project belongs to another user',
        user_id: userIds[1]
      }
    ];

    // Insert projects and get their IDs
    const projectIds = await Promise.all(testProjects.map(async (project) => {
      const result = await pool.query(
        'INSERT INTO projects (name, description, user_id) VALUES ($1, $2, $3) RETURNING id',
        [project.name, project.description, project.user_id]
      );
      return result.rows[0].id;
    }));

    // Insert test work sessions
    const testWorkSessions = [
      {
        start_time: '09:00:00',
        end_time: '10:30:00',
        duration: 90,
        notes: 'First work session for test project 1',
        user_id: userIds[0],
        project_id: projectIds[0],
        date: '2023-05-01'
      },
      {
        start_time: '10:00:00',
        end_time: '11:00:00',
        duration: 60,
        notes: 'Second work session for test project 1',
        user_id: userIds[0],
        project_id: projectIds[0],
        date: '2023-05-01'
      },
      {
        start_time: '14:00:00',
        end_time: '15:30:00',
        duration: 90,
        notes: 'Work session for test project 2',
        user_id: userIds[0],
        project_id: projectIds[1],
        date: '2023-05-02'
      },
      {
        start_time: '09:30:00',
        end_time: '11:00:00',
        duration: 90,
        notes: 'Morning work session for another user',
        user_id: userIds[1],
        project_id: projectIds[2],
        date: '2023-05-03'
      }
    ];

    await Promise.all(testWorkSessions.map(async (session) => {
      await pool.query(
        `INSERT INTO work_sessions 
         (start_time, end_time, duration, notes, user_id, project_id, date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          session.start_time, 
          session.end_time, 
          session.duration, 
          session.notes,
          session.user_id,
          session.project_id,
          session.date
        ]
      );
    }));

    console.log('Test data seeded successfully');
    
    // Return test data for use in tests
    return {
      users: testUsers.map((user, index) => ({
        id: userIds[index],
        username: user.username,
        email: user.email
      })),
      projects: testProjects.map((project, index) => ({
        id: projectIds[index],
        name: project.name,
        description: project.description,
        user_id: project.user_id
      })),
      workSessions: testWorkSessions.map((session, index) => ({
        id: index + 1,  // Since we don't return IDs
        ...session
      }))
    };
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  }
};

/**
 * Generate a JWT token for test authentication
 */
const generateTestToken = (userId, email, secret) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: userId, email }, secret, { expiresIn: '12h' });
};

/**
 * Clean up test database
 */
const teardownTestDatabase = async () => {
  try {
    console.log('Tearing down test database...');
    await pool.query('DELETE FROM work_sessions');
    await pool.query('DELETE FROM projects');
    await pool.query('DELETE FROM users');
    console.log('Test database cleaned up');
  } catch (error) {
    console.error('Error tearing down test database:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run the setup and seeding if this file is executed directly
if (require.main === module) {
  (async () => {
    try {
      await setupTestDatabase();
      await seedTestData();
      console.log('Test database setup complete');
      // Close the pool since we're done
      await pool.end();
    } catch (error) {
      console.error('Error setting up test database:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  setupTestDatabase,
  seedTestData,
  teardownTestDatabase,
  generateTestToken,
  pool
};

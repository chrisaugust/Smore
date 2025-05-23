require('dotenv').config();
const request = require('supertest');
const app = require('../server.js');

const { 
  setupTestDatabase, 
  seedTestData, 
  teardownTestDatabase, 
  generateTestToken,
  pool 
} = require('./integration-test-db-setup');

// Set environment variable for JWT secret
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecrettestsecrettestsecret';

// Global variables to hold test data
let testData;
let testUserToken;

// Setup before all tests
beforeAll(async () => {
  // Setup the database and seed test data
  await setupTestDatabase();
  testData = await seedTestData();
  
  // Generate a JWT token for the first test user
  testUserToken = generateTestToken(
    testData.users[0].id, 
    testData.users[0].email, 
    process.env.JWT_SECRET
  );
});

// Clean up after all tests
afterAll(async () => {
  await teardownTestDatabase();
});

describe('User Authentication Routes', () => {
  describe('POST /api/v1/users/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully!');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(newUser.email);
    });

    it('should return 400 if email is already registered', async () => {
      // Try to register with an existing email
      const existingUserData = {
        username: 'duplicate',
        email: testData.users[0].email, // Use an existing email
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(existingUserData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email is already in use');
    });
  });

  describe('POST /api/v1/users/login', () => {
    it('should login a user with valid credentials', async () => {
      const loginData = {
        email: testData.users[0].email,
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should return 400 for non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email not found');
    });

    it('should return 400 for invalid password', async () => {
      const loginData = {
        email: testData.users[0].email,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid password');
    });
  });
});

describe('Project Routes', () => {
  describe('GET /api/v1/projects', () => {
    it('should get all projects for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Filter projects for the test user (id: 1)
      const userProjects = testData.projects.filter(p => p.user_id === testData.users[0].id);
      expect(response.body.length).toBeGreaterThanOrEqual(userProjects.length);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/projects');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const newProject = {
        name: 'New Test Project',
        description: 'A project created during integration testing'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(newProject);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe(newProject.name);
      expect(response.body.data.description).toBe(newProject.description);
    });
  });

  describe('GET /api/v1/projects/:projectId', () => {
    it('should get a specific project', async () => {
      const projectId = testData.projects[0].id;

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(projectId);
      expect(response.body.name).toBe(testData.projects[0].name);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/v1/projects/99999')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });
  });

  describe('PUT /api/v1/projects/:projectId', () => {
    it('should update a project', async () => {
      const projectId = testData.projects[0].id;
      const updatedData = {
        name: 'Updated Project Name',
        description: 'Updated description',
        status: 'archived'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.description).toBe(updatedData.description);
      expect(response.body.status).toBe(updatedData.status);
    });
  });

  describe('DELETE /api/v1/projects/:projectId', () => {
    it('should delete a project', async () => {
      // Create a project first so we know it exists
      const createResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: 'Project to Delete',
          description: 'This will be deleted'
        });

      const projectId = createResponse.body.data.id;

      // Now delete it
      const deleteResponse = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toBe('Project deleted successfully');
      
      // Verify it's really gone
      const getResponse = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});

describe('Work Session Routes', () => {
  describe('GET /api/v1/projects/:projectId/workSessions', () => {
    it('should get all work sessions for a project', async () => {
      const projectId = testData.projects[0].id;

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/workSessions`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.work_sessions)).toBe(true);
      expect(response.body).toHaveProperty('total_duration');
    });

    it('should return 404 for project with no work sessions', async () => {
      // Create a new project with no sessions
      const createResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: 'Empty Project',
          description: 'No work sessions'
        });

      const emptyProjectId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/v1/projects/${emptyProjectId}/workSessions`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No work sessions found');
    });
  });

  describe('POST /api/v1/projects/:projectId/workSessions', () => {
    it('should create a new work session', async () => {
      const projectId = testData.projects[0].id;
      const newSession = {
        start_time: '09:00',
        end_time: '10:00',
        duration: 60,
        notes: 'Test work session created during integration testing'
      };

      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/workSessions`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(newSession);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.duration).toBe(newSession.duration);
      expect(response.body.data.notes).toBe(newSession.notes);
    });
  });

  describe('GET /api/v1/projects/:projectId/workSessions/:workSessionId', () => {
    it('should get a specific work session', async () => {
      const projectId = testData.projects[0].id;
      const workSessionId = 1; // First work session from our test data

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/workSessions/${workSessionId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(workSessionId);
      expect(response.body.project_id).toBe(projectId);
    });

    it('should return 404 for non-existent work session', async () => {
      const projectId = testData.projects[0].id;

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/workSessions/99999`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Work session not found');
    });
  });

  describe('PUT /api/v1/projects/:projectId/workSessions/:workSessionId', () => {
    it('should update a work session', async () => {
      // Create a work session first
      const projectId = testData.projects[0].id;
      const createResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/workSessions`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          start_time: '14:00',
          end_time: '15:00',
          duration: 60,
          notes: 'Session to update'
        });

      const workSessionId = createResponse.body.data.id;
      
      // Update the work session
      const updatedData = {
        start_time: '14:00',
        end_time: '16:00',
        duration: 120,
        notes: 'Updated session notes',
        date: new Date().toISOString()
      };

      const updateResponse = await request(app)
        .put(`/api/v1/projects/${projectId}/workSessions/${workSessionId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updatedData);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.message).toBe('Work session updated successfully');
      expect(updateResponse.body.work_session.duration).toBe(updatedData.duration);
      expect(updateResponse.body.work_session.notes).toBe(updatedData.notes);
    });
  });

  describe('DELETE /api/v1/projects/:projectId/workSessions/:workSessionId', () => {
    it('should delete a work session', async () => {
      // Create a work session first
      const projectId = testData.projects[0].id;
      const createResponse = await request(app)
        .post(`/api/v1/projects/${projectId}/workSessions`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          start_time: '16:00',
          end_time: '17:00',
          duration: 60,
          notes: 'Session to delete'
        });

      const workSessionId = createResponse.body.data.id;
      
      // Delete the work session
      const deleteResponse = await request(app)
        .delete(`/api/v1/projects/${projectId}/workSessions/${workSessionId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toBe('Work session deleted');
      
      // Verify it's really gone
      const getResponse = await request(app)
        .get(`/api/v1/projects/${projectId}/workSessions/${workSessionId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});

describe('User Work Sessions Visualization', () => {
  describe('GET /api/v1/users/:userId/workSessions', () => {
    it('should get work sessions data for visualization', async () => {
      const userId = testData.users[0].id;

      const response = await request(app)
        .get(`/api/v1/users/${userId}/workSessions`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.work_sessions)).toBe(true);
    });

    it('should handle user with no work sessions', async () => {
      // Create a new user with no work sessions
      const createUserResponse = await request(app)
        .post('/api/v1/users/register')
        .send({
          username: 'emptyuser',
          email: 'empty@example.com',
          password: 'password123'
        });

      const emptyUserId = createUserResponse.body.user.id;
      const emptyUserToken = createUserResponse.body.token;

      const response = await request(app)
        .get(`/api/v1/users/${emptyUserId}/workSessions`)
        .set('Authorization', `Bearer ${emptyUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No work sessions found for the user');
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'test-secret-key-for-testing';

// Simplified auth middleware for testing
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, TEST_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const createAuthTestApp = () => {
  const app = express();
  app.use(express.json());

  // Protected route for testing auth middleware
  app.get('/api/protected', authMiddleware, (req, res) => {
    res.status(200).json({ message: 'Access granted', user: req.user });
  });

  // Token generation route (simulates login)
  app.post('/auth/test-login', (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const token = jwt.sign({ email, id: 'test-user-id' }, TEST_JWT_SECRET, {
      expiresIn: '1h',
    });
    res.status(200).json({ token });
  });

  return app;
};

describe('Auth Middleware', () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    const app = createAuthTestApp();
    server = createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should return 401 when no token is provided', async () => {
    const response = await fetch(`${baseUrl}/api/protected`);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.message).toBe('No token provided');
  });

  it('should return 401 when an invalid token is provided', async () => {
    const response = await fetch(`${baseUrl}/api/protected`, {
      headers: { Authorization: 'Bearer invalid-token-here' },
    });
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.message).toBe('Invalid token');
  });

  it('should return 200 when a valid token is provided', async () => {
    // First, get a valid token
    const loginResponse = await fetch(`${baseUrl}/auth/test-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    const { token } = await loginResponse.json();

    // Use the token to access protected route
    const response = await fetch(`${baseUrl}/api/protected`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Access granted');
    expect(data.user.email).toBe('test@example.com');
  });

  it('should reject token with wrong secret', async () => {
    const wrongToken = jwt.sign(
      { email: 'test@example.com' },
      'wrong-secret',
      { expiresIn: '1h' }
    );
    const response = await fetch(`${baseUrl}/api/protected`, {
      headers: { Authorization: `Bearer ${wrongToken}` },
    });
    expect(response.status).toBe(401);
  });
});

describe('Login Route', () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    const app = createAuthTestApp();
    server = createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should return 400 when email is missing', async () => {
    const response = await fetch(`${baseUrl}/auth/test-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.message).toBe('Email is required');
  });

  it('should return a valid JWT token on successful login', async () => {
    const response = await fetch(`${baseUrl}/auth/test-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.token).toBeDefined();

    // Verify the token is valid
    const decoded = jwt.verify(data.token, TEST_JWT_SECRET);
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.id).toBe('test-user-id');
  });
});

const request = require('supertest');
const app = require('../src/app');
const dbCloser = require('./_close_db');

describe('basic API', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  afterAll(async () => {
    await dbCloser.close();
  });
});

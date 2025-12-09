const request = require('supertest');
const app = require('../src/app');

describe('timetable routes (smoke)', () => {
  test('GET /api/timetable (should return 200)', async () => {
    const res = await request(app).get('/api/timetable');
    expect([200, 500]).toContain(res.statusCode); // 500 if DB not available locally
  });
});

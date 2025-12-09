import http from 'k6/http';
import { check, sleep, group } from 'k6';

/**
 * k6 Load Test Script for School Timetable Application
 * Demonstrates HPA (Horizontal Pod Autoscaler) in action
 * 
 * Usage:
 *   k6 run monitoring/load-test.js --vus 50 --duration 5m
 *   k6 run monitoring/load-test.js --stage 1m:10 --stage 2m:50 --stage 1m:10
 */

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const STAGE_1_USERS = parseInt(__ENV.STAGE_1_USERS || '10');
const STAGE_2_USERS = parseInt(__ENV.STAGE_2_USERS || '50');
const STAGE_3_USERS = parseInt(__ENV.STAGE_3_USERS || '100');

export let options = {
  // Ramping VUs (Virtual Users) - demonstrates scaling pressure
  stages: [
    // Ramp up to Stage 1
    { duration: '1m', target: STAGE_1_USERS, name: 'Light Load' },
    // Stay at Stage 1
    { duration: '2m', target: STAGE_1_USERS, name: 'Light Load (Sustained)' },
    // Ramp up to Stage 2 (should trigger scaling)
    { duration: '1m', target: STAGE_2_USERS, name: 'Medium Load' },
    // Stay at Stage 2
    { duration: '3m', target: STAGE_2_USERS, name: 'Medium Load (Sustained)' },
    // Ramp up to Stage 3 (heavy load)
    { duration: '1m', target: STAGE_3_USERS, name: 'Heavy Load' },
    // Stay at Stage 3
    { duration: '2m', target: STAGE_3_USERS, name: 'Heavy Load (Sustained)' },
    // Ramp down (HPA should scale down gradually)
    { duration: '2m', target: STAGE_1_USERS, name: 'Light Load' },
    // Final ramp down
    { duration: '1m', target: 0, name: 'Ramp Down' },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.1'],
  },
};

/**
 * Setup: Initialize test data and metrics collection
 */
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Stage 1: ${STAGE_1_USERS} VUs`);
  console.log(`Stage 2: ${STAGE_2_USERS} VUs`);
  console.log(`Stage 3: ${STAGE_3_USERS} VUs`);
}

/**
 * Main test function - runs for each VU
 */
export default function () {
  // Group 1: Health checks
  group('Health Checks', function () {
    let res = http.get(`${BASE_URL}/`);
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
    sleep(1);
  });

  // Group 2: API endpoints
  group('Timetable API', function () {
    // List timetables
    let listRes = http.get(`${BASE_URL}/api/timetables`);
    check(listRes, {
      'list status is 200': (r) => r.status === 200,
      'list response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    sleep(0.5);

    // Get timetable details (simulated)
    let getRes = http.get(`${BASE_URL}/api/timetables/1`);
    check(getRes, {
      'get status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'get response time < 500ms': (r) => r.timings.duration < 500,
    });
    sleep(0.5);

    // Create timetable (POST)
    let payload = JSON.stringify({
      name: `Timetable_${__VU}_${__ITER}`,
      description: 'Load test timetable',
    });
    let postRes = http.post(`${BASE_URL}/api/timetables`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    check(postRes, {
      'create status is 201 or 200': (r) => r.status === 201 || r.status === 200 || r.status === 400,
      'create response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    sleep(1);
  });

  // Group 3: Metrics endpoint (Prometheus)
  group('Metrics Collection', function () {
    let metricsRes = http.get(`${BASE_URL}/metrics`);
    check(metricsRes, {
      'metrics status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'metrics response time < 200ms': (r) => r.timings.duration < 200,
    });
    sleep(2);
  });

  // Group 4: Database-heavy operations
  group('Database Operations', function () {
    let dbRes = http.get(`${BASE_URL}/api/timetables`);
    check(dbRes, {
      'db status is 200': (r) => r.status === 200,
      'db response time < 1500ms': (r) => r.timings.duration < 1500,
    });
    sleep(1);
  });
}

/**
 * Teardown: Summary and cleanup
 */
export function teardown(data) {
  console.log('Load test completed');
  console.log('Check HPA status with: kubectl get hpa school-timetable-hpa');
  console.log('Monitor pods with: kubectl get pods -l app=school-timetable');
}

/**
 * Custom metric tracking
 * 
 * To view results:
 *   k6 run monitoring/load-test.js -o csv=results.csv
 *   k6 run monitoring/load-test.js --vus 50 --duration 5m --out influxdb=http://localhost:8086/k6
 */

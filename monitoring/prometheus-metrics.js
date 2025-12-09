/**
 * Prometheus Metrics Configuration
 * Add this to your Node.js application to expose metrics for Prometheus
 * 
 * Usage in app.js:
 * const metrics = require('./metrics');
 * metrics.init(app);
 */

const prometheus = require('prom-client');

// ============================================================================
// Define Custom Metrics
// ============================================================================

// HTTP Request Metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestSize = new prometheus.Histogram({
  name: 'http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000]
});

const httpResponseSize = new prometheus.Histogram({
  name: 'http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000]
});

// Database Metrics
const databaseQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const databaseQueryTotal = new prometheus.Counter({
  name: 'db_queries_total',
  help: 'Total database queries',
  labelNames: ['operation', 'table', 'status']
});

const databaseConnectionsActive = new prometheus.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections'
});

// Cache Metrics
const cacheHits = new prometheus.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache_name']
});

const cacheMisses = new prometheus.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache_name']
});

const cacheSize = new prometheus.Gauge({
  name: 'cache_size_bytes',
  help: 'Cache size in bytes',
  labelNames: ['cache_name']
});

// Business Metrics
const timelinesCreated = new prometheus.Counter({
  name: 'timelines_created_total',
  help: 'Total timelines created',
  labelNames: ['status']
});

const timelinesUpdated = new prometheus.Counter({
  name: 'timelines_updated_total',
  help: 'Total timelines updated'
});

const timelinesDeleted = new prometheus.Counter({
  name: 'timelines_deleted_total',
  help: 'Total timelines deleted'
});

const classesCreated = new prometheus.Counter({
  name: 'classes_created_total',
  help: 'Total classes created'
});

const eventsScheduled = new prometheus.Counter({
  name: 'events_scheduled_total',
  help: 'Total events scheduled',
  labelNames: ['type']
});

// Error Metrics
const applicationErrors = new prometheus.Counter({
  name: 'application_errors_total',
  help: 'Total application errors',
  labelNames: ['error_type', 'severity']
});

const validationErrors = new prometheus.Counter({
  name: 'validation_errors_total',
  help: 'Total validation errors',
  labelNames: ['field', 'rule']
});

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * HTTP Request logging middleware
 */
function httpMetricsMiddleware(req, res, next) {
  const start = Date.now();
  const startSize = JSON.stringify(req.body).length;
  
  // Capture response size
  const originalJson = res.json;
  res.json = function(data) {
    const responseSize = JSON.stringify(data).length;
    httpResponseSize.observe(
      { 
        method: req.method, 
        route: req.route?.path || req.path,
        status_code: res.statusCode 
      },
      responseSize
    );
    return originalJson.call(this, data);
  };

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpRequestDuration.observe(
      { 
        method: req.method, 
        route: req.route?.path || req.path,
        status_code: res.statusCode 
      },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });

    httpRequestSize.observe(
      { 
        method: req.method, 
        route: req.route?.path || req.path 
      },
      startSize
    );
  });

  next();
}

/**
 * Timing wrapper for database operations
 */
function timeQuery(operation, table) {
  return async (fn) => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = (Date.now() - start) / 1000;
      
      databaseQueryDuration.observe(
        { operation, table },
        duration
      );
      
      databaseQueryTotal.inc({
        operation,
        table,
        status: 'success'
      });
      
      return result;
    } catch (error) {
      databaseQueryTotal.inc({
        operation,
        table,
        status: 'error'
      });
      throw error;
    }
  };
}

/**
 * Cache hit/miss tracking
 */
function trackCacheAccess(cacheName, hit) {
  if (hit) {
    cacheHits.inc({ cache_name: cacheName });
  } else {
    cacheMisses.inc({ cache_name: cacheName });
  }
}

// ============================================================================
// Metrics Export
// ============================================================================

/**
 * Initialize metrics middleware and endpoint
 */
function init(app) {
  // Add metrics middleware
  app.use(httpMetricsMiddleware);

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
  });

  console.log('Prometheus metrics initialized');
}

/**
 * Update metrics in your code
 */
function recordBusinessMetric(metricType, labels = {}) {
  switch (metricType) {
    case 'timeline_created':
      timelinesCreated.inc(labels);
      break;
    case 'timeline_updated':
      timelinesUpdated.inc();
      break;
    case 'timeline_deleted':
      timelinesDeleted.inc();
      break;
    case 'class_created':
      classesCreated.inc();
      break;
    case 'event_scheduled':
      eventsScheduled.inc(labels);
      break;
  }
}

function recordError(errorType, severity = 'error') {
  applicationErrors.inc({ error_type: errorType, severity });
}

function recordValidationError(field, rule) {
  validationErrors.inc({ field, rule });
}

module.exports = {
  init,
  httpRequestDuration,
  httpRequestTotal,
  databaseQueryDuration,
  databaseQueryTotal,
  databaseConnectionsActive,
  cacheHits,
  cacheMisses,
  cacheSize,
  recordBusinessMetric,
  recordError,
  recordValidationError,
  trackCacheAccess,
  timeQuery
};

/**
 * Usage Examples:
 * 
 * In app.js:
 * const metrics = require('./metrics');
 * const express = require('express');
 * const app = express();
 * metrics.init(app);
 * 
 * In controllers:
 * const metrics = require('../metrics');
 * 
 * // Record a created timeline
 * metrics.recordBusinessMetric('timeline_created', { status: 'success' });
 * 
 * // Record an error
 * metrics.recordError('InvalidSchedule', 'warning');
 * 
 * // Record validation error
 * metrics.recordValidationError('class_name', 'required');
 * 
 * // Track database operations
 * const result = await metrics.timeQuery('SELECT', 'timelines')(async () => {
 *   return await db.query('SELECT * FROM timelines');
 * });
 * 
 * // Track cache access
 * if (cacheHit) {
 *   metrics.trackCacheAccess('schedule_cache', true);
 * } else {
 *   metrics.trackCacheAccess('schedule_cache', false);
 *   // fetch from database
 * }
 * 
 * // Update active connections
 * metrics.databaseConnectionsActive.set(db.pool.activeConnections);
 * 
 * // Update cache size
 * metrics.cacheSize.set({ cache_name: 'schedule_cache' }, cache.size);
 */

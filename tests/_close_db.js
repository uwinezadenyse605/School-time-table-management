let closed = false;

module.exports = {
  async close() {
    if (closed) return;
    try {
      const db = require('../src/db');
      if (db && typeof db.end === 'function') {
        await db.end();
      }
    } catch (err) {
      // ignore errors during test teardown
    }
    closed = true;
  },
};

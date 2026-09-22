const app = require('./app');
const connectDb = require('./config/db');
const seedDemoUser = require('./services/demoUser.service');
const { PORT } = require('./config/env');

/**
 * 11. START SERVER
 */
connectDb()
  .then(seedDemoUser)
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Optimizer online on port ${PORT}`);
    });
    server.on('error', (err) => {
      console.error(
        err.code === 'EADDRINUSE'
          ? `CRITICAL: Port ${PORT} is already in use. Stop the other process (an old backend or Docker container?) or change PORT.`
          : err
      );
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('CRITICAL: Startup failed. Check MONGODB_URI and other .env values.', err);
    process.exit(1);
  });

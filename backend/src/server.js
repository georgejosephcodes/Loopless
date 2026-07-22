const app = require('./app');
const { PORT } = require('./config/env');

/**
 * 11. START SERVER
 */
app.listen(PORT, () => {
  console.log(`🚀 Optimizer online on port ${PORT}`);
});

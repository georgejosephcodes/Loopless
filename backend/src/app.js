const os = require('os');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { CLIENT_ORIGINS, IS_PROD } = require('./config/env');

require('./config/redis');

const optimizeRoutes = require('./routes/optimize.routes');
const aiRoutes = require('./routes/ai.routes');
const itineraryRoutes = require('./routes/itinerary.routes');
const authRoutes = require('./routes/auth.routes');
const tripsRoutes = require('./routes/trips.routes');
const sharedRoutes = require('./routes/shared.routes');

const app = express();

// Trust exactly the gateway hop, not an arbitrary chain ('true'
// would let a client spoof X-Forwarded-For if ever reachable
// another way).
app.set('trust proxy', 1);

// Lets the gateway's access log show which replica actually served a
// request instead of just a container IP that changes on every rebuild.
app.use((req, res, next) => {
  res.set('X-Served-By', os.hostname());
  next();
});

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Outside production any localhost port is allowed: Vite moves to 5174+ when 5173 is taken.
const LOCAL_DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
app.use(
  cors({
    origin: (origin, cb) =>
      cb(null, !origin || CLIENT_ORIGINS.includes(origin) || (!IS_PROD && LOCAL_DEV_ORIGIN.test(origin))),
    credentials: true,
  })
);
app.use(cookieParser());

// Mounted before the global JSON parser: it installs its own larger body limit.
app.use('/api/trips', tripsRoutes);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/shared', sharedRoutes);
app.use('/api', optimizeRoutes);
app.use('/api', aiRoutes);
app.use('/api', itineraryRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;

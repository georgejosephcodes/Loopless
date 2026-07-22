const express = require('express');
const cors = require('cors');


require('./config/redis');

const optimizeRoutes = require('./routes/optimize.routes');
const aiRoutes = require('./routes/ai.routes');
const itineraryRoutes = require('./routes/itinerary.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', optimizeRoutes);
app.use('/api', aiRoutes);
app.use('/api', itineraryRoutes);

module.exports = app;

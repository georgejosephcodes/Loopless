const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

async function connectDb() {
  await mongoose.connect(MONGODB_URI);
  console.log('🍃 Connected to MongoDB');
}

module.exports = connectDb;

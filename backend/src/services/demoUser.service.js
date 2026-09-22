const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { SEED_DEMO_USER } = require('../config/env');

// Fixed test account. Keep in sync with frontend/src/constants/demo.js.
const DEMO = { name: 'Demo User', email: 'demo@loopless.test', password: 'Demo@12345' };

/** Creates the demo user for local testing. Disabled in production unless SEED_DEMO_USER=true. */
async function seedDemoUser() {
  if (!SEED_DEMO_USER) return;

  const existing = await User.findOne({ email: DEMO.email });
  if (existing && (await bcrypt.compare(DEMO.password, existing.passwordHash))) return;

  const passwordHash = await bcrypt.hash(DEMO.password, 12);
  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
  } else {
    await User.create({ name: DEMO.name, email: DEMO.email, passwordHash });
  }
  console.log(`👤 Demo user ready: ${DEMO.email}`);
}

module.exports = seedDemoUser;

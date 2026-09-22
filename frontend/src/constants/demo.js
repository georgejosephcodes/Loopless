// Test account seeded by the backend (backend/src/services/demoUser.service.js).
export const DEMO_ACCOUNT = { email: 'demo@loopless.test', password: 'Demo@12345' };

// Shown in dev always; in production builds only when VITE_SHOW_DEMO=true.
export const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO === 'true';

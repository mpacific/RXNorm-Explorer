// Runs before each e2e file loads. dotenv never overwrites a variable that's
// already set, so these win over .env; the database settings still come from
// .env. The suite pages through whole result sets, which would trip the
// normal throttle, so it gets a generous one (throttle.e2e-spec.ts sets its
// own).
process.env.THROTTLE_MS = '60000';
process.env.THROTTLE_LIMIT = '100000';
process.env.CORS_ALLOWED = 'http://localhost:3000';

import { validate } from './env.validation';

describe('validate (environment)', () => {
  const env = {
    PORT: '6109',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '3306',
    DATABASE_USER: 'rxnorm_app',
    DATABASE_PASSWORD: 'secret',
    DATABASE_NAME: 'rxnorm',
    CORS_ALLOWED: 'http://localhost:3000',
    THROTTLE_MS: '5000',
    THROTTLE_LIMIT: '10',
  };

  it('converts numeric settings to numbers', () => {
    expect(validate(env)).toMatchObject({
      PORT: 6109,
      DATABASE_PORT: 3306,
      THROTTLE_MS: 5000,
      THROTTLE_LIMIT: 10,
    });
  });

  it('keeps string settings as they are', () => {
    expect(validate(env)).toMatchObject({
      DATABASE_HOST: 'localhost',
      CORS_ALLOWED: 'http://localhost:3000',
    });
  });

  it.each([undefined, ''])('defaults PORT to 3000 when it is %p', (PORT) => {
    expect(validate({ ...env, PORT }).PORT).toBe(3000);
  });

  it.each([
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'CORS_ALLOWED',
    'THROTTLE_MS',
    'THROTTLE_LIMIT',
  ])('refuses to start without %s', (key) => {
    expect(() => validate({ ...env, [key]: undefined })).toThrow(key);
  });

  it.each([
    ['THROTTLE_MS', '60s'],
    ['THROTTLE_MS', '0'],
    ['THROTTLE_LIMIT', '1.5'],
    ['DATABASE_PORT', 'mysql'],
    ['PORT', '70000'],
  ])('rejects %s=%p', (key, value) => {
    expect(() => validate({ ...env, [key]: value })).toThrow(key);
  });

  it('treats an empty value as unset', () => {
    expect(() => validate({ ...env, CORS_ALLOWED: '' })).toThrow(
      'CORS_ALLOWED',
    );
  });
});

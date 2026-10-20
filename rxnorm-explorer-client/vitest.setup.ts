import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// The API URL is inlined at build time in the real app; tests use a fixed one.
process.env.NEXT_PUBLIC_API_URL = 'http://api.test';

afterEach(() => {
  cleanup();
});

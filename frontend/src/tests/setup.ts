import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Dọn DOM sau mỗi test (vitest không bật globals nên RTL không tự cleanup)
afterEach(() => {
  cleanup();
});

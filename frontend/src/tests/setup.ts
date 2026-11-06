import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] ?? null;
  }
}

const mockStorage = new LocalStorageMock();
Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

// Dọn DOM sau mỗi test (vitest không bật globals nên RTL không tự cleanup)
afterEach(() => {
  cleanup();
});

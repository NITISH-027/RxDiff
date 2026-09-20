import '@testing-library/jest-dom';
import '@testing-library/jest-dom/vitest';

// Polyfill ResizeObserver for JSDOM
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Polyfill matchMedia for JSDOM
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Polyfill URL.createObjectURL and URL.revokeObjectURL for JSDOM
if (typeof URL !== 'undefined') {
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => 'blob:mock-object-url';
  } else {
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = (obj: Blob | MediaSource) => {
      try {
        return originalCreate(obj);
      } catch {
        return 'blob:mock-object-url';
      }
    };
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => {};
  }
}

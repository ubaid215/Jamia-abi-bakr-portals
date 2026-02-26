// FILE: src/tests/setup.js
// Vitest global test setup — runs before every test file

import '@testing-library/jest-dom';

// Polyfill for window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => { },
    }),
});

// Silence console.error noise from React during tests
const originalError = console.error;
beforeAll(() => {
    console.error = (...args) => {
        if (args[0]?.includes?.('Not implemented') || args[0]?.includes?.('React Router')) return;
        originalError.call(console, ...args);
    };
});
afterAll(() => {
    console.error = originalError;
});

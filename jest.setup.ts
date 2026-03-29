import '@testing-library/jest-dom';

// Polyfill structuredClone for jsdom (needed by fake-indexeddb)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(val: T): T => JSON.parse(JSON.stringify(val));
}

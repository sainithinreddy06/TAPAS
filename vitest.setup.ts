import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

// jsdom does not implement matchMedia / ResizeObserver, both of which are
// touched by Radix and Recharts.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

globalThis.ResizeObserver =
  globalThis.ResizeObserver ??
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

if (typeof window !== 'undefined') {
  window.URL.createObjectURL = window.URL.createObjectURL || vi.fn(() => 'blob:mock')
  window.URL.revokeObjectURL = window.URL.revokeObjectURL || vi.fn()
}


import "@testing-library/jest-dom/vitest";

// jsdom has no IntersectionObserver implementation; components like
// src/components/Reveal.tsx rely on it existing (as it does in every real
// browser), so stub a no-op version rather than have every page render
// crash into the root error boundary in tests.
class IntersectionObserverStub implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

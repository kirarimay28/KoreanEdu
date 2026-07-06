// Polyfills for the worker thread — must run before pdfjs-dist worker code.
// Using top-level await so dynamic import waits until polyfills are in place.

if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function () {
    let resolve: (v: unknown) => void, reject: (r?: unknown) => void;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve: resolve!, reject: reject! };
  };
}

if (typeof (Array.prototype as any).at === 'undefined') {
  (Array.prototype as any).at = function (index: number) {
    index = Math.trunc(index) || 0;
    if (index < 0) index += this.length;
    if (index < 0 || index >= this.length) return undefined;
    return this[index];
  };
}

if (typeof globalThis.structuredClone === 'undefined') {
  (globalThis as any).structuredClone = (obj: unknown) => JSON.parse(JSON.stringify(obj));
}

if (typeof (Object as any).hasOwn === 'undefined') {
  (Object as any).hasOwn = (obj: object, key: PropertyKey) =>
    Object.prototype.hasOwnProperty.call(obj, key);
}

// Dynamic import ensures polyfills are applied before pdfjs worker initializes
// @ts-expect-error no types for worker build path
await import('pdfjs-dist/legacy/build/pdf.worker.mjs');

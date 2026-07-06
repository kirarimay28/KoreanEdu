// Polyfills for pdfjs-dist v6 on older browsers/iOS
// These must run before pdfjs-dist is imported

if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function () {
    let resolve: any, reject: any;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

if (typeof Array.prototype.at === 'undefined') {
  Array.prototype.at = function (index: number) {
    index = Math.trunc(index) || 0;
    if (index < 0) index += this.length;
    if (index < 0 || index >= this.length) return undefined;
    return this[index];
  };
}

if (typeof globalThis.structuredClone === 'undefined') {
  (globalThis as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

if (typeof Object.hasOwn === 'undefined') {
  (Object as any).hasOwn = (obj: object, key: PropertyKey) =>
    Object.prototype.hasOwnProperty.call(obj, key);
}

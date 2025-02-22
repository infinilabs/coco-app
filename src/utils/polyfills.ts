// Create a new file for polyfills
if (!('hasOwn' in Object)) {
  Object.defineProperty(Object, 'hasOwn', {
    value: function(obj: object, prop: string | symbol): boolean {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    },
    configurable: true,
    writable: true,
    enumerable: false
  });
}
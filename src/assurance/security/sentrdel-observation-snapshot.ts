/**
 * Defensive JSON-data snapshot for untrusted in-process observation inputs.
 *
 * Rejects own accessors, hidden/symbol keys, non-plain objects and sparse arrays
 * before validation. This is NOT a process sandbox: Proxy traps and other code
 * already running in this JavaScript process are outside this boundary.
 */
export function snapshotSentrdelObservationDataV1(value: unknown, depth = 0): unknown {
  if (depth > 4) throw new TypeError("observation nesting limit exceeded");
  if (value === null || typeof value === "string" ||
      typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value !== "object") throw new TypeError("observation must be JSON data");

  const isArray = Array.isArray(value);
  if (!isArray && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError("observation must be plain JSON data");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length > 65) throw new TypeError("observation property limit exceeded");
  // Use the captured `length` descriptor only. A fresh `value.length` read can
  // reach a Proxy `get` trap and differ between checks, admitting a sparse array.
  const length: unknown = isArray ? descriptors["length" as keyof typeof descriptors]?.value : 0;
  if (isArray && (typeof length !== "number" || !Number.isSafeInteger(length) ||
      length > 64 || keys.length !== length + 1)) {
    throw new TypeError("observation arrays must be dense and bounded");
  }
  const result: Record<string, unknown> | unknown[] = isArray ? [] : Object.create(null);
  for (const key of keys) {
    if (typeof key !== "string") throw new TypeError("observation symbol keys forbidden");
    if (isArray && key === "length") continue;
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable ||
        key === "__proto__") {
      throw new TypeError("observation requires enumerable own data properties");
    }
    if (isArray && (!/^(0|[1-9][0-9]*)$/u.test(key) ||
        Number(key) >= (length as number))) {
      throw new TypeError("observation array keys must be indices");
    }
    Object.defineProperty(result, key, {
      value: snapshotSentrdelObservationDataV1(descriptor.value, depth + 1),
      enumerable: true, configurable: false, writable: false,
    });
  }
  return Object.freeze(result);
}

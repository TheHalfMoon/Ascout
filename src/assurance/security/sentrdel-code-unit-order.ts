/**
 * UTF-16 code-unit ordering shared by UA-P06 security contracts.
 *
 * Deterministic across host locales and ICU versions. Never use localeCompare
 * for identity-bearing or receipt-bearing canonical order.
 */
export function compareCodeUnitsV1(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

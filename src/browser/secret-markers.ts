/**
 * Unambiguous raw-secret shapes for browser evidence. Intent, evidence, trace, recovery, and the
 * benchmark leak gate all share this one list, so a stronger pattern can't be missed in a copy.
 */
export const BROWSER_SECRET_MARKERS: readonly RegExp[] = [
  // GitHub personal, OAuth, user-to-server, server-to-server (Actions), and refresh tokens.
  /\bgh[opusr]_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  // AWS long-term and temporary access key IDs.
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
  // Stripe secret and restricted keys, plus the earlier dash-separated form.
  /\b[sr]k_(?:live|test)_[A-Za-z0-9]{10,}/,
  /\bsk-(?:live|test)-[A-Za-z0-9]{10,}/,
  // OpenAI and Anthropic API keys.
  /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/,
  /\bnpm_[A-Za-z0-9]{36}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  // A JSON Web Token: three base64url segments, the first a JSON header.
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/i,
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/,
];

export function containsSecretMarker(text: string): boolean {
  return BROWSER_SECRET_MARKERS.some((marker) => marker.test(text));
}

/** Replaces every secret-shaped match with a fixed marker, for text a page controls. */
export function redactSecretMarkers(text: string): string {
  let redacted = text;
  for (const marker of BROWSER_SECRET_MARKERS) {
    redacted = redacted.replace(new RegExp(marker.source, `${marker.flags.replace("g", "")}g`), "[REDACTED]");
  }
  return redacted;
}

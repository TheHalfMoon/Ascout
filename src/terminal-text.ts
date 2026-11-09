/**
 * Characters that can forge or hide terminal output: C0 and C1 controls (including ESC,
 * CR, and BEL), DEL, the Unicode line and paragraph separators, and the bidirectional
 * marks, embeddings, overrides, and isolates that reorder what is shown.
 */
const TERMINAL_UNSAFE = /[\p{Cc}\u2028\u2029\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;

/** Escapes text from a repository or its configuration before it reaches a terminal. */
export function escapeTerminalText(text: string): string {
  return text.replace(TERMINAL_UNSAFE, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

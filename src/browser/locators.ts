/**
 * Spec 016 P016-06: deterministic locator policy over Playwright
 * user-facing locators.
 *
 * This module orders locator candidates by the canonical strategy
 * priority (role/name first, explicitly declared structural fallback
 * last), records which strategy was selected, and fails closed on
 * ambiguity: multiple matches require explicit disambiguation, and zero
 * matches resolve to an explicit unresolved outcome — never a silent
 * guess. Locator-layer failures carry `E_LOCATOR_*` codes so locator
 * drift stays distinguishable from product assertion failures.
 *
 * The policy is pure and deterministic: match counts arrive as inputs
 * (browser runtimes and the P016-09 benchmark supply real counts), and
 * no model, cache, or heuristic participates in selection. Each strategy
 * documents its Playwright user-facing binding (`getByRole`,
 * `getByLabel`, …) as data; live binding to running pages arrives with
 * the benchmark harness, which feeds observed counts through this
 * policy.
 */

export type LocatorStrategy =
  | "role"
  | "label"
  | "text"
  | "placeholder"
  | "alt-text"
  | "title"
  | "test-id"
  | "structural-fallback";

export type LocatorOutcome = "resolved" | "ambiguous" | "unresolved";

export interface LocatorCandidate {
  readonly strategy: LocatorStrategy;
  readonly role: string | null;
  readonly value: string;
  readonly reason: string | null;
}

export interface LocatorMatchInput {
  readonly candidate: LocatorCandidate;
  readonly match_count: number;
}

export interface LocatorTriedEntry {
  readonly strategy: LocatorStrategy;
  readonly role: string | null;
  readonly value: string;
  readonly reason: string | null;
  readonly match_count: number;
}

export interface LocatorSelection {
  readonly strategy: LocatorStrategy;
  readonly role: string | null;
  readonly value: string;
  readonly index: number;
}

export interface LocatorResolution {
  readonly target_description: string;
  readonly candidates_tried: readonly LocatorTriedEntry[];
  readonly selected: LocatorSelection | null;
  readonly outcome: LocatorOutcome;
  readonly error_code: string | null;
}

export interface DisambiguatedTarget {
  readonly strategy: LocatorStrategy;
  readonly role: string | null;
  readonly value: string;
  readonly index: number;
  readonly match_count: number;
}

export const LOCATOR_AMBIGUOUS = "E_LOCATOR_AMBIGUOUS";
export const LOCATOR_UNRESOLVED = "E_LOCATOR_UNRESOLVED";

const STRATEGY_PRIORITY: readonly LocatorStrategy[] = [
  "role",
  "label",
  "text",
  "placeholder",
  "alt-text",
  "title",
  "test-id",
  "structural-fallback",
];

/**
 * Playwright user-facing binding per strategy, as documented data. The
 * runtime binding (live `getBy*` calls feeding counts back here) arrives
 * with the benchmark harness; this module never calls into Playwright.
 */
export const PLAYWRIGHT_BINDING: Readonly<Record<LocatorStrategy, string>> = {
  "alt-text": "getByAltText",
  label: "getByLabel",
  placeholder: "getByPlaceholder",
  role: "getByRole",
  "structural-fallback": "locator(css, explicitly declared)",
  "test-id": "getByTestId",
  text: "getByText",
  title: "getByTitle",
};

/**
 * Closed ARIA role vocabulary (ARIA 1.2 core plus graphics roles and
 * `generic`). Unknown roles fail closed; newer roles require an
 * explicit contract extension with evidence.
 */
const ARIA_ROLES: readonly string[] = [
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "button",
  "cell",
  "checkbox",
  "columnheader",
  "combobox",
  "complementary",
  "contentinfo",
  "definition",
  "dialog",
  "directory",
  "document",
  "feed",
  "figure",
  "form",
  "generic",
  "graphics-document",
  "graphics-object",
  "graphics-symbol",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "link",
  "list",
  "listbox",
  "listitem",
  "log",
  "main",
  "marquee",
  "math",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "navigation",
  "none",
  "note",
  "option",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "region",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem",
];

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function requireSingleLine(value: string, field: string): void {
  if (value.length === 0 || /[\r\n]/.test(value)) {
    throw new TypeError(`${field} must be non-empty single-line text`);
  }
}

function strategyRank(strategy: LocatorStrategy): number {
  const rank = STRATEGY_PRIORITY.indexOf(strategy);
  if (rank < 0) {
    throw new TypeError(`unknown locator strategy: ${strategy}`);
  }
  return rank;
}

function requireStrategy(value: string): LocatorStrategy {
  const found = STRATEGY_PRIORITY.find((entry) => entry === value);
  if (found === undefined) {
    throw new TypeError(`unknown locator strategy: ${value}`);
  }
  return found;
}

function requireAriaRole(value: string): string {
  if (!ARIA_ROLES.includes(value)) {
    throw new TypeError(`unknown ARIA role: ${value}`);
  }
  return value;
}

/**
 * Creates a validated locator candidate. Role strategy requires a known
 * ARIA role; structural fallback requires an explicit non-empty reason;
 * every strategy requires a non-empty value (name-less matching is the
 * top ambiguity source and stays forbidden in this wedge).
 */
export function createLocatorCandidate(input: {
  readonly strategy: string;
  readonly role: string | null;
  readonly value: string;
  readonly reason: string | null;
}): LocatorCandidate {
  const strategy = requireStrategy(input.strategy);
  requireSingleLine(input.value, "locator value");
  if (strategy === "role") {
    if (input.role === null) {
      throw new TypeError("role strategy requires an ARIA role");
    }
    requireAriaRole(input.role);
  } else if (input.role !== null) {
    throw new TypeError("only role strategy carries a role");
  }
  if (strategy === "structural-fallback") {
    if (input.reason === null) {
      throw new TypeError("structural fallback requires an explicit reason");
    }
    requireSingleLine(input.reason, "structural fallback reason");
  } else if (input.reason !== null) {
    throw new TypeError("only structural fallback carries a reason");
  }
  return {
    reason: input.reason,
    role: input.role,
    strategy,
    value: input.value,
  };
}

/** Orders candidates by strategy priority, then value for determinism. */
export function orderCandidates(
  candidates: readonly LocatorCandidate[],
): readonly LocatorCandidate[] {
  return [...candidates].sort(
    (left, right) =>
      strategyRank(left.strategy) - strategyRank(right.strategy) ||
      compareText(left.value, right.value) ||
      compareText(left.role ?? "", right.role ?? ""),
  );
}

function requireMatchCount(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("match_count must be a non-negative integer");
  }
}

/**
 * Resolves a target from observed match counts. The highest-priority
 * candidate with exactly one match wins and the full tried-list is
 * recorded. Any multi-match fails closed to `ambiguous`; all-zero fails
 * closed to `unresolved`. Outcomes are data — see `requireResolved` for
 * fail-closed call sites.
 */
export function resolveLocators(
  target_description: string,
  inputs: readonly LocatorMatchInput[],
): LocatorResolution {
  requireSingleLine(target_description, "target_description");
  if (inputs.length === 0) {
    throw new TypeError("resolution needs at least one candidate");
  }
  const ranked = orderCandidates(inputs.map((entry) => entry.candidate));
  const counts = new Map<LocatorCandidate, number>();
  for (const entry of inputs) {
    requireMatchCount(entry.match_count);
    counts.set(entry.candidate, entry.match_count);
  }
  const candidates_tried: LocatorTriedEntry[] = ranked.map((candidate) => ({
    match_count: counts.get(candidate) ?? 0,
    reason: candidate.reason,
    role: candidate.role,
    strategy: candidate.strategy,
    value: candidate.value,
  }));
  const exact = candidates_tried.find((entry) => entry.match_count === 1);
  if (exact !== undefined) {
    return {
      candidates_tried,
      error_code: null,
      outcome: "resolved",
      selected: {
        index: 0,
        role: exact.role,
        strategy: exact.strategy,
        value: exact.value,
      },
      target_description,
    };
  }
  if (candidates_tried.some((entry) => entry.match_count > 1)) {
    return {
      candidates_tried,
      error_code: LOCATOR_AMBIGUOUS,
      outcome: "ambiguous",
      selected: null,
      target_description,
    };
  }
  return {
    candidates_tried,
    error_code: LOCATOR_UNRESOLVED,
    outcome: "unresolved",
    selected: null,
    target_description,
  };
}

/**
 * Records an explicit nth-match disambiguation. The caller names the
 * index; bounds are validated; nothing is inferred.
 */
export function disambiguate(
  candidate: LocatorCandidate,
  match_count: number,
  index: number,
): DisambiguatedTarget {
  requireMatchCount(match_count);
  if (!Number.isSafeInteger(index) || index < 0 || index >= match_count) {
    throw new TypeError(
      `disambiguation index ${index} out of bounds for ${match_count} matches`,
    );
  }
  return {
    index,
    match_count,
    role: candidate.role,
    strategy: candidate.strategy,
    value: candidate.value,
  };
}

/** Returns the selection or throws the recorded locator-layer code. */
export function requireResolved(
  resolution: LocatorResolution,
): LocatorSelection {
  if (resolution.selected === null || resolution.outcome !== "resolved") {
    throw new TypeError(
      resolution.error_code ?? "locator resolution failed",
    );
  }
  return resolution.selected;
}

function candidateToJson(candidate: LocatorCandidate): unknown {
  return {
    reason: candidate.reason,
    role: candidate.role,
    strategy: candidate.strategy,
    value: candidate.value,
  };
}

function resolutionToJsonValue(resolution: LocatorResolution): unknown {
  return {
    candidates_tried: resolution.candidates_tried.map((entry) => ({
      match_count: entry.match_count,
      reason: entry.reason,
      role: entry.role,
      strategy: entry.strategy,
      value: entry.value,
    })),
    error_code: resolution.error_code,
    outcome: resolution.outcome,
    selected:
      resolution.selected === null
        ? null
        : {
            index: resolution.selected.index,
            role: resolution.selected.role,
            strategy: resolution.selected.strategy,
            value: resolution.selected.value,
          },
    target_description: resolution.target_description,
  };
}

/** Deterministic serialization with fixed key order. */
export function locatorCandidateToJson(candidate: LocatorCandidate): string {
  return JSON.stringify(candidateToJson(candidate));
}

export function locatorResolutionToJson(
  resolution: LocatorResolution,
): string {
  return JSON.stringify(resolutionToJsonValue(resolution));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string`);
  }
  return value;
}

function readNullableString(
  record: Record<string, unknown>,
  field: string,
): string | null {
  const value = record[field];
  if (value !== null && typeof value !== "string") {
    throw new TypeError(`${field} must be a string or null`);
  }
  return value;
}

function readNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== "number") {
    throw new TypeError(`${field} must be a number`);
  }
  return value;
}

function readRecordArray(
  record: Record<string, unknown>,
  field: string,
): Record<string, unknown>[] {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  const items: Record<string, unknown>[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      throw new TypeError(`${field} must contain only objects`);
    }
    items.push(entry);
  }
  return items;
}

function parseCandidate(entry: Record<string, unknown>): LocatorCandidate {
  return createLocatorCandidate({
    reason: readNullableString(entry, "reason"),
    role: readNullableString(entry, "role"),
    strategy: readString(entry, "strategy"),
    value: readString(entry, "value"),
  });
}

/** Strict parsing with full revalidation; malformed input fails closed. */
export function locatorCandidateFromJson(raw: string): LocatorCandidate {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("locator candidate JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("locator candidate JSON must be an object");
  }
  return parseCandidate(parsed);
}

export function locatorResolutionFromJson(raw: string): LocatorResolution {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError("locator resolution JSON must be parseable");
  }
  if (!isRecord(parsed)) {
    throw new TypeError("locator resolution JSON must be an object");
  }
  const target_description = readString(parsed, "target_description");
  const tried = readRecordArray(parsed, "candidates_tried");
  const inputs: LocatorMatchInput[] = tried.map((entry) => ({
    candidate: parseCandidate(entry),
    match_count: readNumber(entry, "match_count"),
  }));
  const resolution = resolveLocators(target_description, inputs);
  const outcome = readString(parsed, "outcome");
  if (outcome !== resolution.outcome) {
    throw new TypeError("locator resolution outcome contradicts its inputs");
  }
  const errorCode = readNullableString(parsed, "error_code");
  if (errorCode !== resolution.error_code) {
    throw new TypeError("locator resolution code contradicts its inputs");
  }
  return resolution;
}

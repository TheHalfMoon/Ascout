from pathlib import Path

# Ephemeral qualification input only; never merged into the T052 feature branch.
path = Path('src/check.ts')
text = path.read_text()
old = '''  const candidate = value as { readonly success?: unknown; readonly testResults?: unknown };
  return typeof candidate.success === "boolean" && Array.isArray(candidate.testResults);'''
new = '''  const candidate = value as { readonly success?: unknown; readonly testResults?: unknown };
  if (typeof candidate.success !== "boolean" || !Array.isArray(candidate.testResults)) return false;
  return candidate.testResults.every((suite) => {
    if (typeof suite !== "object" || suite === null || Array.isArray(suite)) return false;
    const formatted = suite as { readonly name?: unknown };
    return typeof formatted.name === "string" && formatted.name.length > 0;
  });'''
if text.count(old) != 1:
    raise SystemExit(f'expected one Jest validator anchor, found {text.count(old)}')
path.write_text(text.replace(old, new))

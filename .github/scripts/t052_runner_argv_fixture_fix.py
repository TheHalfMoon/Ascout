from pathlib import Path

path = Path("tests/jest-task.contract.test.ts")
text = path.read_text()
old = '''function rootFiles(): DiscoveryFileMap {\n  return {\n    "package.json": JSON.stringify({ private: true, devDependencies: { jest: "30.4.2" } }),\n    "node_modules/.bin/jest": "",\n    "jest.config.cjs": "",\n  };\n}\n'''
new = '''function rootFiles(extra: DiscoveryFileMap = {}): DiscoveryFileMap {\n  return {\n    "package.json": JSON.stringify({ private: true, devDependencies: { jest: "30.4.2" } }),\n    "node_modules/.bin/jest": "",\n    "jest.config.cjs": "",\n    ...extra,\n  };\n}\n'''
if text.count(old) != 1:
    raise SystemExit(f"expected one Jest rootFiles helper, found {text.count(old)}")
path.write_text(text.replace(old, new))

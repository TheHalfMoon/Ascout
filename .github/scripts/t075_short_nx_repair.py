from pathlib import Path

run = Path('benchmarks/run.mjs')
text = run.read_text()
anchor = '''function runtimeEnvironment(root, commandEnv = {}) {
  const pathValue = process.env.PATH;'''
replacement = '''function shortNxDir(root) {
  return join(tmpdir(), `a75-nx-${sha256Bytes(Buffer.from(root, "utf8")).slice(0, 16)}`);
}

function runtimeEnvironment(root, commandEnv = {}) {
  const pathValue = process.env.PATH;'''
if text.count(anchor) != 1:
    raise SystemExit('runtimeEnvironment anchor drifted')
text = text.replace(anchor, replacement)
old_env = '''    NX_SOCKET_DIR: join(root, "nx"),'''
new_env = '''    NX_SOCKET_DIR: shortNxDir(root),'''
if text.count(old_env) != 1:
    raise SystemExit('NX env anchor drifted')
text = text.replace(old_env, new_env)
old_dir = '''    mkdir(join(root, "nx"), { recursive: true }),'''
new_dir = '''    mkdir(shortNxDir(root), { recursive: true }),'''
if text.count(old_dir) != 1:
    raise SystemExit('NX dir anchor drifted')
text = text.replace(old_dir, new_dir)
old_start = '''  const controllerRoot = await mkdtemp(join(tmpdir(), `ascout-t075-${caseRecord.case_id}-`));
  try {'''
new_start = '''  const controllerRoot = await mkdtemp(join(tmpdir(), `ascout-t075-${caseRecord.case_id}-`));
  const runtimeRoots = [controllerRoot];
  try {'''
if text.count(old_start) != 1:
    raise SystemExit('executeCase start anchor drifted')
text = text.replace(old_start, new_start)
old_obs = '''      const observationRoot = join(controllerRoot, `observation-${index + 1}`);
      await ensureRuntimeDirs(observationRoot);'''
new_obs = '''      const observationRoot = join(controllerRoot, `observation-${index + 1}`);
      runtimeRoots.push(observationRoot);
      await ensureRuntimeDirs(observationRoot);'''
if text.count(old_obs) != 1:
    raise SystemExit('observation anchor drifted')
text = text.replace(old_obs, new_obs)
old_finally = '''  } finally {
    if (!options.keepTemp) await rm(controllerRoot, { recursive: true, force: true });
  }
}'''
new_finally = '''  } finally {
    await Promise.all(runtimeRoots.map((runtimeRoot) => rm(shortNxDir(runtimeRoot), { recursive: true, force: true })));
    if (!options.keepTemp) await rm(controllerRoot, { recursive: true, force: true });
  }
}'''
if text.count(old_finally) != 1:
    raise SystemExit('executeCase finally anchor drifted')
text = text.replace(old_finally, new_finally)
run.write_text(text)

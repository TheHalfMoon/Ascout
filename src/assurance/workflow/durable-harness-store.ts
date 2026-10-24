import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, rename, rmdir, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { canonicalAssuranceJsonV1 } from "../contracts/canonical-serialization.js";
import {
  DURABLE_HARNESS_MAX_BYTES, decodeDurableHarnessSnapshotV1, durableHarnessRecoveryV1,
  encodeDurableHarnessSnapshotV1, parseDurableHarnessBindingV1, parseDurableHarnessCallV1, parseDurableHarnessOutcomeV1,
  type DurableHarnessBindingV1, type DurableHarnessCallV1, type DurableHarnessOutcomeV1,
  type DurableHarnessPayloadV1, type DurableHarnessRecoveryV1,
} from "./durable-harness.js";

function missing(error: unknown): boolean { return (error as NodeJS.ErrnoException)?.code === "ENOENT"; }
async function regular(path: string): Promise<void> {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new TypeError("durable state must be a regular nonsymlink file");
}
async function directory(path: string, create: boolean): Promise<void> {
  if (create) {
    try { await mkdir(path, { mode: 0o700 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new TypeError("durable state directory must not be a symlink");
}
async function stateDirectory(repositoryRoot: string, create: boolean): Promise<string> {
  if (!isAbsolute(repositoryRoot)) throw new TypeError("explicit absolute trusted repository root required");
  const root = resolve(repositoryRoot);
  await directory(root, false);
  const local = join(root, ".ascout"), state = join(local, "durable-harness");
  await directory(local, create); await directory(state, create);
  const ignore = join(state, ".gitignore");
  if (create) {
    try { await writeFile(ignore, "*\n", { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
  await regular(ignore);
  if ((await lstat(ignore)).size !== 2 || await readFile(ignore, "utf8") !== "*\n") throw new TypeError("durable state ignore rule conflicts with required private storage");
  return state;
}

/**
 * Bounded local evidence metadata, never an executor or automatic retry loop.
 * One cooperative writer per run; abandoned locks require explicit operator repair.
 */
export class AscoutDurableHarness {
  private constructor(private readonly root: string, private readonly expected: DurableHarnessBindingV1) {}
  private get filename(): string { return join(this.root, this.expected.run_identity + ".json"); }
  private get lock(): string { return join(this.root, this.expected.run_identity + ".lock"); }

  static async create(repositoryRoot: string, value: DurableHarnessBindingV1): Promise<AscoutDurableHarness> {
    const binding = parseDurableHarnessBindingV1(value);
    const store = new AscoutDurableHarness(await stateDirectory(repositoryRoot, true), binding);
    await store.exclusive(async () => {
      try { await lstat(store.filename); }
      catch (error) {
        if (!missing(error)) throw error;
        await store.save({ schema_version: 1, binding, calls: [] }); return;
      }
      throw new TypeError("durable journal already exists; open it explicitly");
    });
    return store;
  }
  static async open(repositoryRoot: string, value: DurableHarnessBindingV1): Promise<AscoutDurableHarness> {
    const binding = parseDurableHarnessBindingV1(value);
    const store = new AscoutDurableHarness(await stateDirectory(repositoryRoot, false), binding);
    await store.load();
    return store;
  }
  private async exclusive<T>(action: () => Promise<T>): Promise<T> {
    // Never steal a preexisting lock, even if its alleged owner appears stopped.
    await mkdir(this.lock, { mode: 0o700 });
    try { return await action(); }
    finally { await rmdir(this.lock); }
  }
  private async load(): Promise<DurableHarnessPayloadV1> {
    await regular(this.filename);
    const handle = await open(this.filename, "r");
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > DURABLE_HARNESS_MAX_BYTES) throw new TypeError("invalid or oversized durable journal");
      const buffer = Buffer.alloc(DURABLE_HARNESS_MAX_BYTES + 1);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
        if (bytesRead === 0) break;
        length += bytesRead;
      }
      if (length > DURABLE_HARNESS_MAX_BYTES) throw new TypeError("durable journal byte limit exceeded");
      const payload = decodeDurableHarnessSnapshotV1(buffer.subarray(0, length).toString("utf8"));
      if (payload.binding.run_identity !== this.expected.run_identity) throw new TypeError("foreign durable run identity");
      return payload;
    } finally { await handle.close(); }
  }
  private async save(payload: DurableHarnessPayloadV1): Promise<void> {
    const bytes = encodeDurableHarnessSnapshotV1(payload);
    const temporary = join(this.root, this.expected.run_identity + "." + randomUUID() + ".tmp");
    const handle = await open(temporary, "wx", 0o600);
    try {
      try { await handle.writeFile(bytes, "utf8"); await handle.sync(); }
      finally { await handle.close(); }
      await rename(temporary, this.filename);
    } finally {
      try { await unlink(temporary); }
      catch (error) { if (!missing(error)) throw error; }
    }
  }
  private async mutate(change: (payload: DurableHarnessPayloadV1) => DurableHarnessPayloadV1): Promise<void> {
    await this.exclusive(async () => {
      const payload = await this.load();
      if (canonicalAssuranceJsonV1(payload.binding) !== canonicalAssuranceJsonV1(this.expected)) throw new TypeError("durable source/repository binding changed; revalidation required");
      const updated = change(payload);
      if (updated !== payload) await this.save(updated);
    });
  }
  async begin(value: DurableHarnessCallV1): Promise<void> {
    const call = parseDurableHarnessCallV1(value);
    await this.mutate((payload) => {
      const previous = payload.calls.find((record) => record.call_identity === call.call_identity);
      if (previous) {
        const { state: _state, evidence_sha256: _evidence, ...identity } = previous;
        if (canonicalAssuranceJsonV1(identity) !== canonicalAssuranceJsonV1(call)) throw new TypeError("durable memo identity changed");
        return payload;
      }
      return { ...payload, calls: [...payload.calls, { ...call, state: "IN_PROGRESS", evidence_sha256: null }] };
    });
  }
  async complete(value: DurableHarnessOutcomeV1): Promise<void> {
    const outcome = parseDurableHarnessOutcomeV1(value);
    await this.mutate((payload) => {
      const previous = payload.calls.find((record) => record.call_identity === outcome.call_identity);
      if (!previous || previous.attempt_identity !== outcome.attempt_identity || previous.state !== "IN_PROGRESS") throw new TypeError("durable outcome has no matching unfinished attempt");
      return { ...payload, calls: payload.calls.map((record) => record === previous ? { ...record, state: outcome.state, evidence_sha256: outcome.evidence_sha256 } : record) };
    });
  }
  async recover(): Promise<DurableHarnessRecoveryV1> {
    return this.exclusive(async () => durableHarnessRecoveryV1(await this.load(), this.expected));
  }
}

import { readFileSync, realpathSync } from "node:fs";
import { win32 } from "node:path";

import type { ProbeRunnerV1 } from "./capability-probes.js";
import { execFileTextV1, realLinuxFsHostV1, type ExecFileTextV1, type LinuxFsHostV1, type SandboxNetworkV1 } from "./linux-fs-sandbox.js";

/**
 * FD-4 T1-FS and T1-NET, Windows, research (founder decision 2026-11-13: research and implementation,
 * not certification). Runs a task in a fresh AppContainer: an identity with no access to the user's
 * files. The workspace is the only user folder granted to it (the Node binary gets read and execute
 * when app containers can't already read it). Whatever every app container may read stays readable:
 * Windows, Program Files, some registry keys, and objects with open access lists. Without network
 * capabilities an app container can't reach the network, the host's loopback included. With
 * `network: "shared"` it gets the client and private-network capabilities, but Windows still blocks
 * an app container's loopback.
 *
 * The task starts suspended inside a job that kills every process in it when the run ends or times
 * out, and it inherits only its output handle and NUL.
 *
 * The Win32 calls are made from Windows PowerShell 5.1 (at its fixed system path) through Add-Type, so
 * no native binary ships. Application-control policy (WDAC, Constrained Language Mode) can block that;
 * the runner then refuses. Every input reaches PowerShell as an environment variable, never as script
 * text. After each run the grants and the container profile are removed, by the PowerShell script
 * itself and again by an independent cleanup from Node, which also covers a PowerShell host that was
 * killed.
 *
 * Nothing in Ascout runs tasks through this, the containment tier stays T0 (containment-tier.ts), and a
 * Windows claim needs an independent human security review. Technique-level probes are kept privately.
 */

/** The C# and PowerShell that create the container, grant access, run Node, and clean up. */
export const APPCONTAINER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class AscoutAc {
  [StructLayout(LayoutKind.Sequential)] public struct SID_AND_ATTRIBUTES { public IntPtr Sid; public uint Attributes; }
  [StructLayout(LayoutKind.Sequential)] public struct SECURITY_CAPABILITIES { public IntPtr AppContainerSid; public IntPtr Capabilities; public uint CapabilityCount; public uint Reserved; }
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] public struct STARTUPINFO { public int cb; public string lpReserved; public string lpDesktop; public string lpTitle; public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags; public short wShowWindow, cbReserved2; public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError; }
  [StructLayout(LayoutKind.Sequential)] public struct STARTUPINFOEX { public STARTUPINFO StartupInfo; public IntPtr lpAttributeList; }
  [StructLayout(LayoutKind.Sequential)] public struct PROCESS_INFORMATION { public IntPtr hProcess, hThread; public int dwProcessId, dwThreadId; }
  [StructLayout(LayoutKind.Sequential)] public struct SECURITY_ATTRIBUTES { public int nLength; public IntPtr lpSecurityDescriptor; public bool bInheritHandle; }
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int CreateAppContainerProfile(string name, string display, string desc, IntPtr caps, uint count, out IntPtr sid);
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int DeriveAppContainerSidFromAppContainerName(string name, out IntPtr sid);
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] public static extern int DeleteAppContainerProfile(string name);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool ConvertSidToStringSid(IntPtr sid, out string s);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool ConvertStringSidToSid(string s, out IntPtr sid);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attr, IntPtr value, IntPtr size, IntPtr prev, IntPtr retSize);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool CreateProcess(string app, StringBuilder cmd, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string cwd, ref STARTUPINFOEX si, out PROCESS_INFORMATION pi);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern IntPtr CreateFile(string name, uint access, uint share, ref SECURITY_ATTRIBUTES sa, uint disp, uint flags, IntPtr tmpl);
  [StructLayout(LayoutKind.Sequential)] struct JOBOBJECT_BASIC_LIMIT_INFORMATION { public long PerProcessUserTimeLimit, PerJobUserTimeLimit; public uint LimitFlags; public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint PriorityClass, SchedulingClass; }
  [StructLayout(LayoutKind.Sequential)] struct IO_COUNTERS { public ulong a, b, c, d, e, f; }
  [StructLayout(LayoutKind.Sequential)] struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION { public JOBOBJECT_BASIC_LIMIT_INFORMATION Basic; public IO_COUNTERS Io; public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed; }
  [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr CreateJobObject(IntPtr sa, string name);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool SetInformationJobObject(IntPtr job, int cls, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info, uint size);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
  [DllImport("kernel32.dll", SetLastError = true)] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr h, uint ms);
  [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr h, uint code);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  public static string Create(string name) {
    IntPtr sid; int hr = CreateAppContainerProfile(name, name, "Ascout sandbox", IntPtr.Zero, 0, out sid);
    if (hr != 0) { hr = DeriveAppContainerSidFromAppContainerName(name, out sid); if (hr != 0) throw new Exception("AppContainer 0x" + hr.ToString("x")); }
    string s; ConvertSidToStringSid(sid, out s); return s;
  }
  public static void Run(string name, string[] capabilitySids, string app, string cmdline, string cwd, string env, string stdoutPath, uint timeoutMs) {
    IntPtr sid; int hr = DeriveAppContainerSidFromAppContainerName(name, out sid); if (hr != 0) throw new Exception("derive 0x" + hr.ToString("x"));
    int n = capabilitySids.Length; int entry = Marshal.SizeOf(typeof(SID_AND_ATTRIBUTES));
    IntPtr capsArray = n == 0 ? IntPtr.Zero : Marshal.AllocHGlobal(entry * n);
    for (int i = 0; i < n; i++) {
      IntPtr capSid; if (!ConvertStringSidToSid(capabilitySids[i], out capSid)) throw new Exception("capability sid");
      // SE_GROUP_ENABLED
      Marshal.StructureToPtr(new SID_AND_ATTRIBUTES { Sid = capSid, Attributes = 4 }, capsArray + i * entry, false);
    }
    var caps = new SECURITY_CAPABILITIES { AppContainerSid = sid, Capabilities = capsArray, CapabilityCount = (uint)n };
    IntPtr size = IntPtr.Zero; InitializeProcThreadAttributeList(IntPtr.Zero, 2, 0, ref size);
    IntPtr list = Marshal.AllocHGlobal(size); if (!InitializeProcThreadAttributeList(list, 2, 0, ref size)) throw new Exception("attributes " + Marshal.GetLastWin32Error());
    IntPtr capsPtr = Marshal.AllocHGlobal(Marshal.SizeOf(caps)); Marshal.StructureToPtr(caps, capsPtr, false);
    // PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES
    if (!UpdateProcThreadAttribute(list, 0, (IntPtr)0x00020009, capsPtr, (IntPtr)Marshal.SizeOf(caps), IntPtr.Zero, IntPtr.Zero)) throw new Exception("attribute " + Marshal.GetLastWin32Error());
    var sa = new SECURITY_ATTRIBUTES { nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES)), bInheritHandle = true };
    // The output file lives outside the workspace; the task writes it only through this inherited handle.
    IntPtr outH = CreateFile(stdoutPath, 0x40000000, 3, ref sa, 2, 0x80, IntPtr.Zero);
    IntPtr nulH = CreateFile("NUL", 0xC0000000, 3, ref sa, 3, 0x80, IntPtr.Zero);
    // Only these two handles are inherited, never anything else PowerShell holds.
    IntPtr handles = Marshal.AllocHGlobal(IntPtr.Size * 2); Marshal.WriteIntPtr(handles, outH); Marshal.WriteIntPtr(handles + IntPtr.Size, nulH);
    // PROC_THREAD_ATTRIBUTE_HANDLE_LIST
    if (!UpdateProcThreadAttribute(list, 0, (IntPtr)0x00020002, handles, (IntPtr)(IntPtr.Size * 2), IntPtr.Zero, IntPtr.Zero)) throw new Exception("handle list " + Marshal.GetLastWin32Error());
    // A job that kills every process in it, descendants included, when its handle closes.
    IntPtr job = CreateJobObject(IntPtr.Zero, null); if (job == IntPtr.Zero) throw new Exception("job " + Marshal.GetLastWin32Error());
    var limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION(); limits.Basic.LimitFlags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    if (!SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(limits))) throw new Exception("job limits " + Marshal.GetLastWin32Error());
    var si = new STARTUPINFOEX(); si.StartupInfo.cb = Marshal.SizeOf(si); si.lpAttributeList = list;
    si.StartupInfo.dwFlags = 0x100; si.StartupInfo.hStdInput = nulH; si.StartupInfo.hStdOutput = outH; si.StartupInfo.hStdError = nulH;
    IntPtr envPtr = Marshal.StringToHGlobalUni(env);
    PROCESS_INFORMATION pi;
    // EXTENDED_STARTUPINFO_PRESENT | CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW | CREATE_SUSPENDED
    if (!CreateProcess(app, new StringBuilder(cmdline), IntPtr.Zero, IntPtr.Zero, true, 0x80000 | 0x400 | 0x08000000 | 0x4, envPtr, cwd, ref si, out pi)) throw new Exception("CreateProcess " + Marshal.GetLastWin32Error());
    // In the job before it runs a single instruction, so nothing it starts escapes the job.
    if (!AssignProcessToJobObject(job, pi.hProcess)) { TerminateProcess(pi.hProcess, 1); throw new Exception("assign job " + Marshal.GetLastWin32Error()); }
    ResumeThread(pi.hThread);
    WaitForSingleObject(pi.hProcess, timeoutMs);
    // Closing the job kills the whole tree; wait for the task itself to be gone before cleanup.
    CloseHandle(job);
    WaitForSingleObject(pi.hProcess, 10000);
    CloseHandle(pi.hThread); CloseHandle(pi.hProcess); CloseHandle(outH); CloseHandle(nulH);
  }
}
'@
$name = $env:ASCOUT_AC_NAME
$workspace = $env:ASCOUT_AC_WORKSPACE
$node = $env:ASCOUT_AC_NODE
$out = $env:ASCOUT_AC_STDOUT
$icacls = Join-Path $env:SystemRoot 'System32\icacls.exe'
$sid = [AscoutAc]::Create($name)
$granted = @()
try {
  # Recorded first, so even a grant that fails halfway is removed.
  $granted += $workspace
  & $icacls $workspace /grant "*$($sid):(OI)(CI)M" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'could not grant the workspace' }
  # The task script lives outside the workspace, readable but not writable by the container.
  $granted += $env:ASCOUT_AC_SCRIPTFILE
  & $icacls $env:ASCOUT_AC_SCRIPTFILE /grant "*$($sid):R" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'could not grant the task script' }
  # Best effort: under Program Files, app containers can already read Node, and the grant is refused.
  try { & $icacls $node /grant "*$($sid):RX" 2>&1 | Out-Null; if ($LASTEXITCODE -eq 0) { $granted += $node } } catch { }
  $caps = @()
  # internetClient, privateNetworkClientServer
  if ($env:ASCOUT_AC_NETWORK -eq 'shared') { $caps = @('S-1-15-3-1', 'S-1-15-3-3') }
  $envBlock = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:ASCOUT_AC_ENV))
  # node -e reads the script by its full path: running a file would make Node resolve every parent
  # folder, which the container can't see.
  $cmd = '"' + $node + '" -e "eval(require(''node:fs'').readFileSync(process.argv[1], ''utf8''))" "' + $env:ASCOUT_AC_SCRIPTFILE + '" ' + $env:ASCOUT_AC_TASK
  [AscoutAc]::Run($name, $caps, $node, $cmd, $workspace, $envBlock, $out, [uint32]$env:ASCOUT_AC_TIMEOUT_MS)
} finally {
  foreach ($path in $granted) { try { & $icacls $path /remove "*$sid" 2>&1 | Out-Null } catch { } }
  if ([AscoutAc]::DeleteAppContainerProfile($name) -ne 0) { [Console]::Error.WriteLine('the container profile was not deleted') }
}
`;

/**
 * A second, independent cleanup, run from Node after every run whatever happened to the first: the
 * container SID is derived again from its name, its grants are removed, and its profile is deleted.
 * It covers a PowerShell host that was killed before its own cleanup ran.
 */
export const APPCONTAINER_CLEANUP_SCRIPT = String.raw`
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AscoutAcCleanup {
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int DeriveAppContainerSidFromAppContainerName(string name, out IntPtr sid);
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] public static extern int DeleteAppContainerProfile(string name);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool ConvertSidToStringSid(IntPtr sid, out string s);
  public static string Sid(string name) { IntPtr sid; if (DeriveAppContainerSidFromAppContainerName(name, out sid) != 0) return null; string s; ConvertSidToStringSid(sid, out s); return s; }
}
'@
$icacls = Join-Path $env:SystemRoot 'System32\icacls.exe'
$sid = [AscoutAcCleanup]::Sid($env:ASCOUT_AC_NAME)
if ($sid) {
  foreach ($path in @($env:ASCOUT_AC_WORKSPACE, $env:ASCOUT_AC_NODE, $env:ASCOUT_AC_SCRIPTFILE)) { try { & $icacls $path /remove "*$sid" 2>&1 | Out-Null } catch { } }
}
[AscoutAcCleanup]::DeleteAppContainerProfile($env:ASCOUT_AC_NAME) | Out-Null
`;

/** The Windows system folder, from the environment, or its usual place when that names none. */
export function systemRootV1(env: NodeJS.ProcessEnv): string {
  return env.SystemRoot ?? "C:\\Windows";
}

/** Windows PowerShell 5.1, at its fixed location under the system root, never PATH. */
export function windowsPowerShellPathV1(systemRoot: string): string {
  return win32.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
}

/** A Windows environment block: NAME=value entries, each ended by NUL, and a final NUL. */
export function environmentBlockV1(env: NodeJS.ProcessEnv): string {
  const entries = Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined && entry[0] !== "" && !entry[0].includes("=") && !entry[0].includes("\0") && !entry[1].includes("\0"));
  entries.sort(([a], [b]) => (a.toUpperCase() < b.toUpperCase() ? -1 : a.toUpperCase() > b.toUpperCase() ? 1 : 0));
  return `${entries.map(([name, value]) => `${name}=${value}`).join("\0")}\0\0`;
}

const lower = (path: string): string => path.toLowerCase();
const insideWin = (path: string, parent: string): boolean => lower(path).startsWith(`${lower(parent).replace(/\\$/u, "")}\\`);

/**
 * Why `workspace` can't be the container's writable folder, or null when it can: not a drive root,
 * the home folder or an ancestor of it, nor inside Windows, Program Files, ProgramData, or the home
 * folder's AppData (except folders inside its temporary folder) and dot-folders.
 */
export function windowsWorkspaceRefusalV1(workspace: string, home: string, systemRoot: string): string | null {
  if (!win32.isAbsolute(workspace) || !/^[A-Za-z]:\\/u.test(workspace) || win32.normalize(workspace) !== workspace || /["\u0000-\u001f]/u.test(workspace)) return "the workspace must be an absolute, normalized drive path";
  if (/^[A-Za-z]:\\$/u.test(workspace)) return "the workspace may not be a drive root";
  if (lower(workspace) === lower(home) || insideWin(home, workspace)) return `the workspace may not be or contain ${home}`;
  // Other users' profiles and Public sit beside the home folder.
  const profiles = win32.dirname(home);
  if (insideWin(workspace, profiles) && !insideWin(workspace, home)) return `the workspace may not be in another profile under ${profiles}`;
  const drive = workspace.slice(0, 3);
  for (const parent of [systemRoot, win32.join(drive, "Program Files"), win32.join(drive, "Program Files (x86)"), win32.join(drive, "ProgramData")]) {
    if (lower(workspace) === lower(parent) || insideWin(workspace, parent)) return `the workspace may not be inside ${parent}`;
  }
  if (insideWin(workspace, home)) {
    const first = workspace.slice(home.length + 1).split("\\")[0]!;
    // The user's temporary folder lives in AppData\Local\Temp; folders inside it are allowed.
    const inTemp = insideWin(workspace, win32.join(home, "AppData", "Local", "Temp"));
    if (first.startsWith(".") || (lower(first) === "appdata" && !inTemp)) return `the workspace may not be inside ${win32.join(home, first)}`;
  }
  return null;
}

export interface WindowsSandboxDepsV1 {
  readonly platform: NodeJS.Platform;
  readonly host: LinuxFsHostV1;
  readonly exec: ExecFileTextV1;
  readonly execPath: string;
  readonly systemRoot: string;
  readonly readText: (path: string) => string;
  readonly randomName: () => string;
  /** Where the profile variables Windows needs to start a contained process come from. */
  readonly startupEnv: NodeJS.ProcessEnv;
  /** How long the task may run before its whole process tree is killed. */
  readonly taskTimeoutMs: number;
}

export const realWindowsSandboxDepsV1: WindowsSandboxDepsV1 = {
  platform: process.platform,
  // Native resolution expands 8.3 short names (PROGRA~1), so the refusal rules see real paths.
  host: { ...realLinuxFsHostV1, realpath: (path) => realpathSync.native(path) },
  exec: execFileTextV1,
  execPath: process.execPath,
  systemRoot: systemRootV1(process.env),
  readText: (path) => readFileSync(path, "utf8"),
  randomName: () => `ascout.sandbox.${Math.random().toString(36).slice(2, 12)}`,
  startupEnv: process.env,
  taskTimeoutMs: 20_000,
};

/** The probe script as a file: argv[2] carries the task, base64-encoded so no quoting can break it. */
const wrap = (script: string): string => `process.argv.splice(1, 2, Buffer.from(process.argv[2], "base64").toString("utf8"));\n${script}`;

/**
 * A probe runner that runs the capability probe in a fresh AppContainer, or the reason it can't. It
 * refuses, never falls back to running unsandboxed: not Windows, no Windows PowerShell, or a self-test
 * that fails. The self-test checks isolation: a marker beside an empty workspace must be unreadable.
 */
export async function windowsAppContainerProbeRunnerV1(deps: WindowsSandboxDepsV1 = realWindowsSandboxDepsV1, network: SandboxNetworkV1 = "none"): Promise<{ runner: ProbeRunnerV1 } | { refused: string }> {
  if (deps.platform !== "win32") return { refused: "the AppContainer sandbox is Windows only" };
  const powershell = windowsPowerShellPathV1(deps.systemRoot);
  if (!deps.host.exists(powershell)) return { refused: `Windows PowerShell is not installed at ${powershell}` };
  const node = deps.host.realpath(deps.execPath);
  const home = deps.host.realpath(deps.host.home());
  const runInside = async (workspace: string, script: string, task: string, env: NodeJS.ProcessEnv): Promise<string> => {
    const refusal = windowsWorkspaceRefusalV1(workspace, home, deps.systemRoot);
    if (refusal !== null) throw new Error(`${refusal}: ${JSON.stringify(workspace)}`);
    const scratch = deps.host.realpath(deps.host.makeTempDir());
    // The task script and its output live in the scratch folder, never in the user's workspace.
    const scriptFile = win32.join(scratch, "task.js");
    const stdout = win32.join(scratch, "stdout.txt");
    const psEnv = {
      SystemRoot: deps.systemRoot,
      // So PowerShell treats .exe files as programs; icacls itself is called by its full path.
      PATHEXT: ".COM;.EXE",
      ASCOUT_AC_NAME: deps.randomName(),
      ASCOUT_AC_WORKSPACE: workspace,
      ASCOUT_AC_NODE: node,
      ASCOUT_AC_STDOUT: stdout,
      ASCOUT_AC_SCRIPTFILE: scriptFile,
      ASCOUT_AC_TASK: Buffer.from(task, "utf8").toString("base64"),
      ASCOUT_AC_ENV: Buffer.from(environmentBlockV1(env), "utf8").toString("base64"),
      ASCOUT_AC_NETWORK: network,
      ASCOUT_AC_TIMEOUT_MS: String(deps.taskTimeoutMs),
    };
    const args = (script: string) => ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script];
    try {
      deps.host.writeFile(scriptFile, wrap(script));
      // The outer limit leaves PowerShell time to start, kill the task's tree, and clean up.
      await deps.exec(powershell, args(APPCONTAINER_SCRIPT), { cwd: scratch, env: psEnv, timeoutMs: deps.taskTimeoutMs + 60_000 });
      return deps.host.exists(stdout) ? deps.readText(stdout) : "";
    } finally {
      try {
        await deps.exec(powershell, args(APPCONTAINER_CLEANUP_SCRIPT), { cwd: scratch, env: psEnv, timeoutMs: 60_000 });
      } finally {
        deps.host.removeDir(scratch);
      }
    }
  };
  const root = deps.host.realpath(deps.host.makeTempDir());
  let result: string;
  try {
    const workspace = win32.join(root, "workspace");
    const marker = win32.join(root, "outside-marker");
    deps.host.makeDir(workspace);
    deps.host.writeFile(marker, "outside");
    const script = `let r = "sandbox-ok"; try { require("node:fs").readFileSync(${JSON.stringify(marker)}); r = "escaped"; } catch {} process.stdout.write(r)`;
    // The profile variables are needed for Windows to start a process in the container.
    const startup = Object.fromEntries(["LOCALAPPDATA", "USERPROFILE", "TEMP", "TMP"].map((name) => [name, deps.startupEnv[name]]));
    result = await runInside(workspace, script, "{}", { SystemRoot: deps.systemRoot, ...startup });
  } finally {
    deps.host.removeDir(root);
  }
  if (result === "escaped") return { refused: "the AppContainer started but did not hide a file outside its workspace" };
  if (result !== "sandbox-ok") return { refused: "the AppContainer sandbox did not start (is PowerShell blocked by application control?)" };
  return { runner: (script, task, env, cwd) => runInside(deps.host.realpath(cwd), script, JSON.stringify(task), env) };
}

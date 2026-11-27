import { execFile } from "node:child_process";
import { lstatSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { join, win32 } from "node:path";

import { allowlistedTaskEnvNamesV1, PASS_ENV_NAME } from "./task-environment.js";
import { realWindowsSandboxDepsV1, windowsAppContainerProbeRunnerV1, windowsPowerShellPathV1, windowsWorkspaceRefusalV1, type WindowsSandboxDepsV1 } from "./windows-appcontainer-sandbox.js";

/**
 * FD-4 T1 on Windows: an AppContainer for `check` / `test` tasks.
 *
 * One container serves the whole run (tasks execute sequentially under `.ascout/run.lock`). Before
 * the first task it is created and granted:
 * - modify access to the repository root and the files directly in it, and to every top-level folder
 *   except `.git` and `.ascout`, skipping links and junctions. `.git` gets nothing, so a task can't
 *   plant hooks or configuration that later run on the host. `.ascout`, Ascout's evidence folder, gets
 *   nothing either; each task's result folders are granted for that task only, revoked from Node in
 *   `afterTask` even if PowerShell is killed, and sealed into host-only storage before inspection;
 * - read and execute access to the Node and package-manager entry points only.
 *
 * It refuses a repository whose `.git` is not a real folder (a worktree's gitfile could be repointed),
 * a repository with submodules, and any repository containing hard-linked files (a hard link to an
 * outside file would share the container's grant). Before creating a container it replays any crash-
 * recovery ACL ledger (`.ascout/pending-acl-cleanup.json`) left by an earlier interrupted run, writes
 * a new ledger before modifying ACLs, and runs an isolation self-test requiring every denial including
 * loopback refusal and environment allowlisting.
 *
 * Each task starts suspended in the container inside a kill-on-close Job Object. Its output goes
 * straight to Ascout's own pipes, and it inherits no other handle. Its environment is built inside
 * `run-task.ps1` from an explicit allowlist (`allowlistedTaskEnvNamesV1("win32")` + `CI` + operator
 * `--pass-env`), with temporary, AppData, and home variables redirected to the container's own folder.
 * It has no network capabilities, so it reaches no network, the host's loopback included. After the
 * run, `dispose()` removes the container's ACL entries, deletes the container profile, and clears the
 * crash-recovery ledger.
 *
 * The Win32 calls are made from Windows PowerShell 5.1 at its fixed path, so no native binary ships.
 *
 * Known limits:
 * - whatever every app container may read stays readable: Windows, Program Files, and objects with
 *   open access lists;
 * - granting the repository rewrites its access lists for the run, which is slow on very large trees;
 * - a folder a task creates at the repository's top level isn't granted to it;
 * - Node inside the container runs with --preserve-symlinks and --preserve-symlinks-main, and
 *   fs.realpathSync fails (it reads every parent folder from the drive root), so tools that depend
 *   on real paths can fail there; such a task fails, it never runs outside the container;
 * - a Node child process started with pipes can hang inside the container (Windows CI, 2026-11-16),
 *   so test runners that spawn piped workers fail rather than running unsandboxed;
 * - the repository's own files stay writable;
 * - there is no memory or CPU limit beyond Ascout's timeout and output caps;
 * - setup changes the access lists of the Node install's entry points for the run (an install under
 *   Program Files needs administrator rights, otherwise setup refuses).
 */

const crossSpawn = createRequire(import.meta.url)("cross-spawn") as { _parse: (file: string, args: readonly string[], options: object) => { command: string; args: string[]; options: { windowsVerbatimArguments?: boolean } } };

/** Quotes one argument so CommandLineToArgvW reads it back unchanged. */
export function quoteWindowsArgV1(arg: string): string {
  if (arg !== "" && !/[\s"]/u.test(arg)) return arg;
  let out = '"';
  let backslashes = 0;
  for (const ch of arg) {
    if (ch === "\\") {
      backslashes += 1;
      continue;
    }
    out += ch === '"' ? `${"\\".repeat(backslashes * 2 + 1)}"` : `${"\\".repeat(backslashes)}${ch}`;
    backslashes = 0;
  }
  return `${out}${"\\".repeat(backslashes * 2)}"`;
}

/** npm's own batch shims and the script each one runs with node.exe. */
const NPM_SHIMS: Readonly<Record<string, string>> = { "npm.cmd": "npm-cli.js", "npx.cmd": "npx-cli.js" };

/**
 * The program and full command line for CreateProcess. npm's and npx's batch shims in the Node folder
 * run as node.exe on npm's own script, which is all the shims do: inside the container cmd.exe can't
 * use the Node folder (Windows CI, 2026-11-16). Other batch files run through cmd.exe, escaped exactly
 * as cross-spawn escapes them for Node's own launches.
 */
export function windowsCommandLineV1(file: string, argv: readonly string[], nodeFolder?: string): { app: string; commandLine: string } {
  if (!win32.isAbsolute(file)) throw new Error(`a sandboxed command must be an absolute path resolved outside the repository: ${JSON.stringify(file)}`);
  const script = NPM_SHIMS[win32.basename(file).toLowerCase()];
  if (nodeFolder !== undefined && script !== undefined && win32.dirname(file).toLowerCase() === nodeFolder.toLowerCase()) {
    const node = win32.join(nodeFolder, "node.exe");
    // Node resolves a script's real path by reading every parent folder from the drive root, which
    // the container can't; these flags make it use the path as given.
    return { app: node, commandLine: [node, "--preserve-symlinks", "--preserve-symlinks-main", win32.join(nodeFolder, "node_modules", "npm", "bin", script), ...argv].map(quoteWindowsArgV1).join(" ") };
  }
  const parsed = crossSpawn._parse(file, argv, {});
  if (parsed.options.windowsVerbatimArguments === true) return { app: parsed.command, commandLine: [quoteWindowsArgV1(parsed.command), ...parsed.args].join(" ") };
  return { app: file, commandLine: [file, ...argv].map(quoteWindowsArgV1).join(" ") };
}

/** Creates the container and grants it the repository (except .git and .ascout) and the Node entry points. */
export const WINDOWS_TASK_SETUP_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AscoutAcSetup {
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int CreateAppContainerProfile(string name, string display, string desc, IntPtr caps, uint count, out IntPtr sid);
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int GetAppContainerFolderPath(string sid, out IntPtr path);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool ConvertSidToStringSid(IntPtr sid, out string s);
  public static string[] Create(string name) {
    IntPtr sid; int hr = CreateAppContainerProfile(name, name, "Ascout task sandbox", IntPtr.Zero, 0, out sid);
    if (hr != 0) throw new Exception("AppContainer 0x" + hr.ToString("x"));
    string s; ConvertSidToStringSid(sid, out s);
    IntPtr p; hr = GetAppContainerFolderPath(s, out p); if (hr != 0) throw new Exception("folder 0x" + hr.ToString("x"));
    return new string[] { s, Marshal.PtrToStringUni(p) };
  }
}
'@
$icacls = Join-Path $env:SystemRoot 'System32\icacls.exe'
$made = [AscoutAcSetup]::Create($env:ASCOUT_AC_NAME)
$sid = $made[0]
# No deny entries: an app container's access check ignored them (Windows CI, 2026-11-16). Instead the
# root is granted for itself and the files directly in it, and every top-level folder except .git and
# .ascout is granted with inheritance. Links and junctions are skipped, so no grant leaves the repository.
& $icacls $env:ASCOUT_AC_WORKSPACE /grant "*$($sid):(OI)(NP)M" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'could not grant the repository' }
foreach ($dir in (Get-ChildItem -LiteralPath $env:ASCOUT_AC_WORKSPACE -Force -Directory | Where-Object { -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -and $_.Name -ne '.git' -and $_.Name -ne '.ascout' })) {
  & $icacls $dir.FullName /grant "*$($sid):(OI)(CI)M" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'could not grant a repository folder' }
}
# The Node folder itself, without inheritance: cmd.exe must list it to start a .cmd file there.
& $icacls $env:ASCOUT_AC_NODEFOLDER /grant "*$($sid):RX" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'could not grant the Node folder' }
foreach ($file in ($env:ASCOUT_AC_NODEFILES -split '\|' | Where-Object { $_ })) {
  & $icacls $file /grant "*$($sid):RX" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'could not grant a Node entry point' }
}
foreach ($dir in ($env:ASCOUT_AC_NODEDIRS -split '\|' | Where-Object { $_ })) {
  & $icacls $dir /grant "*$($sid):(OI)(CI)RX" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'could not grant a Node folder' }
}
[Console]::Out.Write($made[1])
`;

/** Removes the container's entries from every path it was granted or denied, then deletes it. */
export const WINDOWS_TASK_CLEANUP_SCRIPT = String.raw`
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AscoutAcTaskCleanup {
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int DeriveAppContainerSidFromAppContainerName(string name, out IntPtr sid);
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] public static extern int DeleteAppContainerProfile(string name);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool ConvertSidToStringSid(IntPtr sid, out string s);
  public static string Sid(string name) { IntPtr sid; if (DeriveAppContainerSidFromAppContainerName(name, out sid) != 0) return null; string s; ConvertSidToStringSid(sid, out s); return s; }
}
'@
$icacls = Join-Path $env:SystemRoot 'System32\icacls.exe'
$sid = [AscoutAcTaskCleanup]::Sid($env:ASCOUT_AC_NAME)
$ok = $false
if ($sid) {
  $ok = $true
  $folders = @(Get-ChildItem -LiteralPath $env:ASCOUT_AC_WORKSPACE -Force -Directory -ErrorAction SilentlyContinue | Where-Object { -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) } | ForEach-Object { $_.FullName })
  foreach ($path in @(($env:ASCOUT_AC_PATHS -split '\|' | Where-Object { $_ }) + $folders)) {
    if (Test-Path -LiteralPath $path) {
      try { & $icacls $path /remove "*$sid" 2>&1 | Out-Null; if ($LASTEXITCODE -ne 0) { $ok = $false } } catch { $ok = $false }
    }
  }
}
[AscoutAcTaskCleanup]::DeleteAppContainerProfile($env:ASCOUT_AC_NAME) | Out-Null
if ($ok) { [Console]::Out.Write('ASCOUT_CLEANUP_OK') }
`;

/** Removes per-task result-folder grants from Node even if the run-task PowerShell host was killed. */
export const WINDOWS_TASK_REVOKE_SCRIPT = String.raw`
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AscoutAcTaskRevoke {
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int DeriveAppContainerSidFromAppContainerName(string name, out IntPtr sid);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool ConvertSidToStringSid(IntPtr sid, out string s);
  public static string Sid(string name) { IntPtr sid; if (DeriveAppContainerSidFromAppContainerName(name, out sid) != 0) return null; string s; ConvertSidToStringSid(sid, out s); return s; }
}
'@
$icacls = Join-Path $env:SystemRoot 'System32\icacls.exe'
$sid = [AscoutAcTaskRevoke]::Sid($env:ASCOUT_AC_NAME)
$ok = $false
if ($sid) {
  $ok = $true
  foreach ($dir in ($env:ASCOUT_AC_WRITABLE -split '\|' | Where-Object { $_ })) {
    if (Test-Path -LiteralPath $dir) {
      try { & $icacls $dir /remove:g "*$sid" 2>&1 | Out-Null; if ($LASTEXITCODE -ne 0) { $ok = $false } } catch { $ok = $false }
    }
  }
}
if ($ok) { [Console]::Out.Write('ASCOUT_REVOKE_OK') }
`;

/** Runs one task in the container: args are container name, base64 program, command line, folder, AC dir, writable dirs, and allowlisted env names. */
export const WINDOWS_TASK_RUN_SCRIPT = String.raw`
param([string]$name, [string]$app64, [string]$cmd64, [string]$cwd64, [string]$acDir, [string]$writable64, [string]$allow64)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class AscoutAcTask {
  [StructLayout(LayoutKind.Sequential)] public struct SECURITY_CAPABILITIES { public IntPtr AppContainerSid; public IntPtr Capabilities; public uint CapabilityCount; public uint Reserved; }
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] public struct STARTUPINFO { public int cb; public string lpReserved; public string lpDesktop; public string lpTitle; public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags; public short wShowWindow, cbReserved2; public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError; }
  [StructLayout(LayoutKind.Sequential)] public struct STARTUPINFOEX { public STARTUPINFO StartupInfo; public IntPtr lpAttributeList; }
  [StructLayout(LayoutKind.Sequential)] public struct PROCESS_INFORMATION { public IntPtr hProcess, hThread; public int dwProcessId, dwThreadId; }
  [StructLayout(LayoutKind.Sequential)] public struct SECURITY_ATTRIBUTES { public int nLength; public IntPtr lpSecurityDescriptor; public bool bInheritHandle; }
  [StructLayout(LayoutKind.Sequential)] struct JOBOBJECT_BASIC_LIMIT_INFORMATION { public long PerProcessUserTimeLimit, PerJobUserTimeLimit; public uint LimitFlags; public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize; public uint ActiveProcessLimit; public UIntPtr Affinity; public uint PriorityClass, SchedulingClass; }
  [StructLayout(LayoutKind.Sequential)] struct IO_COUNTERS { public ulong a, b, c, d, e, f; }
  [StructLayout(LayoutKind.Sequential)] struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION { public JOBOBJECT_BASIC_LIMIT_INFORMATION Basic; public IO_COUNTERS Io; public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed; }
  [DllImport("userenv.dll", CharSet = CharSet.Unicode)] static extern int DeriveAppContainerSidFromAppContainerName(string name, out IntPtr sid);
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool ConvertSidToStringSid(IntPtr sid, out string s);
  public static string Sid(string name) { IntPtr sid; if (DeriveAppContainerSidFromAppContainerName(name, out sid) != 0) throw new Exception("derive"); string s; ConvertSidToStringSid(sid, out s); return s; }
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attr, IntPtr value, IntPtr size, IntPtr prev, IntPtr retSize);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool CreateProcess(string app, StringBuilder cmd, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string cwd, ref STARTUPINFOEX si, out PROCESS_INFORMATION pi);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern IntPtr CreateFile(string name, uint access, uint share, ref SECURITY_ATTRIBUTES sa, uint disp, uint flags, IntPtr tmpl);
  [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr GetStdHandle(int which);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool SetHandleInformation(IntPtr h, uint mask, uint flags);
  [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr CreateJobObject(IntPtr sa, string name);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool SetInformationJobObject(IntPtr job, int cls, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info, uint size);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
  [DllImport("kernel32.dll", SetLastError = true)] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr h, uint ms);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr h, out uint code);
  [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr h, uint code);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  public static int Run(string name, string app, string cmdline, string cwd, string env) {
    IntPtr sid; int hr = DeriveAppContainerSidFromAppContainerName(name, out sid); if (hr != 0) throw new Exception("derive 0x" + hr.ToString("x"));
    var caps = new SECURITY_CAPABILITIES { AppContainerSid = sid, Capabilities = IntPtr.Zero, CapabilityCount = 0 };
    IntPtr size = IntPtr.Zero; InitializeProcThreadAttributeList(IntPtr.Zero, 2, 0, ref size);
    IntPtr list = Marshal.AllocHGlobal(size); if (!InitializeProcThreadAttributeList(list, 2, 0, ref size)) throw new Exception("attributes " + Marshal.GetLastWin32Error());
    IntPtr capsPtr = Marshal.AllocHGlobal(Marshal.SizeOf(caps)); Marshal.StructureToPtr(caps, capsPtr, false);
    // PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES, with no capabilities: no network at all.
    if (!UpdateProcThreadAttribute(list, 0, (IntPtr)0x00020009, capsPtr, (IntPtr)Marshal.SizeOf(caps), IntPtr.Zero, IntPtr.Zero)) throw new Exception("attribute " + Marshal.GetLastWin32Error());
    var sa = new SECURITY_ATTRIBUTES { nLength = Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES)), bInheritHandle = true };
    IntPtr nulH = CreateFile("NUL", 0xC0000000, 3, ref sa, 3, 0x80, IntPtr.Zero);
    // The task writes straight to Ascout's own pipes, and inherits nothing else PowerShell holds.
    IntPtr outH = GetStdHandle(-11), errH = GetStdHandle(-12);
    SetHandleInformation(outH, 1, 1); SetHandleInformation(errH, 1, 1);
    IntPtr[] inherit = outH == errH ? new IntPtr[] { outH, nulH } : new IntPtr[] { outH, errH, nulH };
    IntPtr handles = Marshal.AllocHGlobal(IntPtr.Size * inherit.Length);
    for (int i = 0; i < inherit.Length; i++) Marshal.WriteIntPtr(handles + i * IntPtr.Size, inherit[i]);
    // PROC_THREAD_ATTRIBUTE_HANDLE_LIST
    if (!UpdateProcThreadAttribute(list, 0, (IntPtr)0x00020002, handles, (IntPtr)(IntPtr.Size * inherit.Length), IntPtr.Zero, IntPtr.Zero)) throw new Exception("handle list " + Marshal.GetLastWin32Error());
    IntPtr job = CreateJobObject(IntPtr.Zero, null); if (job == IntPtr.Zero) throw new Exception("job " + Marshal.GetLastWin32Error());
    var limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION(); limits.Basic.LimitFlags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    if (!SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(limits))) throw new Exception("job limits " + Marshal.GetLastWin32Error());
    var si = new STARTUPINFOEX(); si.StartupInfo.cb = Marshal.SizeOf(si); si.lpAttributeList = list;
    si.StartupInfo.dwFlags = 0x100; si.StartupInfo.hStdInput = nulH; si.StartupInfo.hStdOutput = outH; si.StartupInfo.hStdError = errH;
    IntPtr envPtr = Marshal.StringToHGlobalUni(env);
    PROCESS_INFORMATION pi;
    // EXTENDED_STARTUPINFO_PRESENT | CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW | CREATE_SUSPENDED
    if (!CreateProcess(app, new StringBuilder(cmdline), IntPtr.Zero, IntPtr.Zero, true, 0x80000 | 0x400 | 0x08000000 | 0x4, envPtr, cwd, ref si, out pi)) throw new Exception("CreateProcess " + Marshal.GetLastWin32Error());
    if (!AssignProcessToJobObject(job, pi.hProcess)) { TerminateProcess(pi.hProcess, 1); throw new Exception("assign job " + Marshal.GetLastWin32Error()); }
    ResumeThread(pi.hThread);
    WaitForSingleObject(pi.hProcess, 0xFFFFFFFF);
    uint code; GetExitCodeProcess(pi.hProcess, out code);
    // Closing the job kills anything the task left running.
    CloseHandle(job); CloseHandle(pi.hThread); CloseHandle(pi.hProcess); CloseHandle(nulH);
    return (int)code;
  }
}
'@
$dec = { param($s) [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s)) }
$allowed = @{}
foreach ($envName in ((& $dec $allow64) -split '\|' | Where-Object { $_ })) { $allowed[$envName.ToUpperInvariant()] = $true }
$procVars = [Environment]::GetEnvironmentVariables('Process')
$vars = @{}
foreach ($k in $procVars.Keys) {
  if ($allowed.ContainsKey($k.ToString().ToUpperInvariant())) { $vars[$k] = $procVars[$k] }
}
$vars['CI'] = '1'
$tmp = Join-Path $acDir 'Temp'
# Windows itself points an app container's TEMP and TMP at LOCALAPPDATA\Packages\<name>\AC\Temp, so
# LOCALAPPDATA must stay the real one: three levels above the container's AC folder.
$vars['LOCALAPPDATA'] = Split-Path (Split-Path (Split-Path $acDir -Parent) -Parent) -Parent
foreach ($name2 in @('TEMP', 'TMP', 'APPDATA', 'USERPROFILE', 'HOME')) { $vars[$name2] = $tmp }
# Node resolves each script's real path by reading every parent folder from the drive root, which the
# container can't; with these flags it uses the path as given (Windows CI, 2026-11-16).
$nodeKey = @($vars.Keys | Where-Object { $_ -ieq 'NODE_OPTIONS' })
$existing = if ($nodeKey.Count -gt 0) { $vars[$nodeKey[0]]; $vars.Remove($nodeKey[0]) } else { '' }
$vars['NODE_OPTIONS'] = ('--preserve-symlinks --preserve-symlinks-main ' + $existing).Trim()
$entries = @($vars.Keys | Sort-Object | ForEach-Object { "$_=$($vars[$_])" })
$block = ($entries -join [char]0) + [char]0 + [char]0
# After the task's environment is captured: PowerShell needs .EXE in PATHEXT to run icacls as a program.
$env:PATHEXT = '.COM;.EXE'
$icacls = Join-Path $env:SystemRoot 'System32\icacls.exe'
$sid = [AscoutAcTask]::Sid($name)
$writable = @((& $dec $writable64) -split '\|' | Where-Object { $_ })
$code = 1
try {
  # This task's result folders only, granted for the task and removed after it.
  foreach ($dir in $writable) {
    & $icacls $dir /grant "*$($sid):(OI)(CI)M" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'could not grant a result folder' }
  }
  $code = [AscoutAcTask]::Run($name, (& $dec $app64), (& $dec $cmd64), (& $dec $cwd64), $block)
} finally {
  foreach ($dir in $writable) { try { & $icacls $dir /remove:g "*$sid" 2>&1 | Out-Null } catch { } }
}
exit $code
`;

export interface WindowsTaskSandboxV1 {
  readonly mechanism: "windows-appcontainer";
  readonly wrap: (file: string, argv: readonly string[], cwd: string, writable: readonly string[]) => { readonly file: string; readonly argv: readonly string[] };
  /** Removes per-task result-folder grants from Node even if the PowerShell host was killed. */
  readonly afterTask: (writable: readonly string[]) => Promise<void>;
  /** Removes every grant and deletes the container; call once every task has finished. */
  readonly dispose: () => Promise<void>;
}

export interface WindowsTaskSandboxOptionsV1 {
  readonly passEnv?: readonly string[];
}

const insideWin = (path: string, parent: string): boolean => path.toLowerCase() === parent.toLowerCase() || path.toLowerCase().startsWith(`${parent.toLowerCase().replace(/\\$/u, "")}\\`);
const b64 = (text: string): string => Buffer.from(text, "utf8").toString("base64");

/**
 * Walks the repository tree (excluding `.git`, `.ascout`, and symlinks/junctions) and returns the
 * first relative path with link count > 1, or null when no hard link is present.
 */
export function findRepositoryHardLinkV1(root: string): string | null {
  const stack: Array<{ readonly abs: string; readonly rel: string; readonly depth: number }> = [
    { abs: root, rel: "", depth: 0 },
  ];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = readdirSync(current.abs);
    entries.sort();
    for (const name of entries) {
      const lower = name.toLowerCase();
      if (current.depth === 0 && (lower === ".git" || lower === ".ascout")) continue;
      const abs = join(current.abs, name);
      const rel = current.rel === "" ? name : `${current.rel}/${name}`;
      const stat = lstatSync(abs, { bigint: true });
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        stack.push({ abs, rel, depth: current.depth + 1 });
      } else if (stat.nlink > 1n) {
        return rel;
      }
    }
  }
  return null;
}

export interface WindowsPathStatV1 {
  readonly isSymbolicLink: boolean;
  readonly isDirectory: boolean;
  readonly isFile: boolean;
  readonly nlink: bigint;
}

export const realLstatPathV1 = (path: string): WindowsPathStatV1 | null => {
  const stat = lstatSync(path, { bigint: true, throwIfNoEntry: false });
  if (stat === undefined) return null;
  return {
    isSymbolicLink: stat.isSymbolicLink(),
    isDirectory: stat.isDirectory(),
    isFile: stat.isFile(),
    nlink: stat.nlink,
  };
};

export const realRemoveFileV1 = (path: string): void => {
  rmSync(path, { force: true });
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Refuses `.git` layouts that could let the writable workspace reach Git hooks or config
 * executed later by host Git calls (exact parity with Linux and macOS task sandboxes).
 */
export function windowsGitReachRefusalV1(
  gitDir: string,
  host: Pick<WindowsSandboxDepsV1["host"], "symlinkTarget" | "exists">,
  readText: (path: string) => string,
): string | null {
  for (const name of ["hooks", "config"]) {
    let target: string | null = null;
    try {
      target = host.symlinkTarget(win32.join(gitDir, name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (target !== null) {
      return `the repository's .git\\${name} is a link, which could point into the writable tree`;
    }
  }
  const configPath = win32.join(gitDir, "config");
  if (host.exists(configPath) && /(^|\])\s*\[\s*include(if\b|\s*\])/imu.test(readText(configPath))) {
    return "the repository's Git configuration includes other files, which could lie in the writable tree";
  }
  return null;
}

interface PendingAclCleanupLedgerV1 {
  readonly name: string;
  readonly workspace: string;
  readonly paths: readonly string[];
}

export function parsePendingCleanupLedgerV1(
  raw: string,
  expectedWorkspace: string,
  expectedNodeFolder: string,
): PendingAclCleanupLedgerV1 | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (
      typeof record.name !== "string" ||
      !/^ascout\.sandbox\.[a-z0-9]+$/iu.test(record.name) ||
      typeof record.workspace !== "string" ||
      record.workspace.toLowerCase() !== expectedWorkspace.toLowerCase() ||
      !Array.isArray(record.paths) ||
      !record.paths.every(
        (entry) =>
          typeof entry === "string" &&
          !entry.includes("|") &&
          !entry.includes("/") &&
          win32.normalize(entry) === entry &&
          (insideWin(entry, expectedWorkspace) || insideWin(entry, expectedNodeFolder)),
      )
    ) {
      return null;
    }
    return { name: record.name, workspace: record.workspace, paths: record.paths };
  } catch {
    return null;
  }
}

export type WindowsTaskSandboxDepsV1 = WindowsSandboxDepsV1 & {
  /** A host loopback port nothing inside the container may reach, for the self-test; null refuses. */
  readonly loopbackPort: () => Promise<{ port: number; close: () => void } | null>;
  /** Runs a file and returns both output streams, so a failed self-test can say why. */
  readonly execBoth: (file: string, argv: readonly string[], options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number }) => Promise<{ stdout: string; stderr: string }>;
  /** Returns the first hard-linked path inside the repository, or null if none exist. */
  readonly findHardLink: (root: string) => string | null;
  /** Non-following lstat for `.ascout` and ledger validation (catches dangling symlinks and hard links). */
  readonly lstatPath: (path: string) => WindowsPathStatV1 | null;
  /** Removes a single file (such as the crash-recovery ACL ledger). */
  readonly removeFile: (path: string) => void;
};

export const realExecBothV1: WindowsTaskSandboxDepsV1["execBoth"] = (file, argv, { cwd, env, timeoutMs }) => new Promise((resolve) => {
  execFile(file, [...argv], { cwd, env, encoding: "utf8", timeout: timeoutMs, windowsHide: true }, (_error, stdout, stderr) => resolve({ stdout, stderr }));
});

export const realLoopbackPortV1 = (): Promise<{ port: number; close: () => void } | null> => new Promise((resolve) => {
  const server = createServer((socket) => { socket.on("error", Boolean); socket.end("host"); });
  server.once("error", () => resolve(null));
  server.listen(0, "127.0.0.1", () => resolve({ port: (server.address() as { port: number }).port, close: () => server.close() }));
});

const realTaskDeps: WindowsTaskSandboxDepsV1 = {
  ...realWindowsSandboxDepsV1,
  loopbackPort: realLoopbackPortV1,
  execBoth: realExecBothV1,
  findHardLink: findRepositoryHardLinkV1,
  lstatPath: realLstatPathV1,
  removeFile: realRemoveFileV1,
};

const NODE_FILE_ENTRIES = ["node.exe", "npm.cmd", "npx.cmd", "corepack.cmd", "pnpm.cmd", "yarn.cmd", "npm", "npx", "corepack"] as const;
const NODE_DIR_ENTRIES = ["node_modules\\npm", "node_modules\\corepack", "node_modules\\pnpm", "node_modules\\yarn"] as const;

/** What the self-test task must report, run in the real container against the real repository. */
export const WINDOWS_SELF_TEST_EXPECTED = {
  outside: "EPERM",
  outsideWrite: "EPERM",
  git: "EPERM",
  evidence: "EPERM",
  results: "allowed",
  canary: "absent",
  loopback: "denied",
} as const;

/**
 * The task sandbox for `workspace`, or why it can't be used. It refuses, never falls back to running
 * unsandboxed: not Windows, no Windows PowerShell, invalid `--pass-env`, a refused repository or Node
 * folder, a worktree, submodules, `.git` hooks/config links or includes, hard-linked files, a symlinked
 * `.ascout` or ledger, a failing isolation self-test (including missing loopback probe), or a container
 * that can't be created and granted.
 */
export async function prepareWindowsTaskSandboxV1(
  workspace: string,
  deps: WindowsTaskSandboxDepsV1 = realTaskDeps,
  options: WindowsTaskSandboxOptionsV1 = {},
): Promise<{ sandbox: WindowsTaskSandboxV1 } | { refused: string }> {
  if (deps.platform !== "win32") return { refused: "the AppContainer task sandbox is Windows only" };
  const passEnv = options.passEnv ?? [];
  for (const envName of passEnv) {
    if (!PASS_ENV_NAME.test(envName)) return { refused: `invalid --pass-env name: ${JSON.stringify(envName)}` };
  }
  const allowedEnvNames = [...new Set([...allowlistedTaskEnvNamesV1("win32"), "CI", ...passEnv])];
  const powershell = windowsPowerShellPathV1(deps.systemRoot);
  if (!deps.host.exists(powershell)) return { refused: `Windows PowerShell is not installed at ${powershell}` };
  let root: string;
  let gitDir: string | null;
  let nodeFolder: string;
  let nodeFiles: string[];
  let nodeDirs: string[];
  let evidence: string;
  let ledgerPath: string;
  let evidenceStat: WindowsPathStatV1 | null;
  let ledgerStat: WindowsPathStatV1 | null;
  try {
    const home = deps.host.realpath(deps.host.home());
    root = deps.host.realpath(workspace);
    const refusal = windowsWorkspaceRefusalV1(root, home, deps.systemRoot);
    if (refusal !== null) return { refused: `${refusal}: ${JSON.stringify(root)}` };
    const execPath = deps.host.realpath(deps.execPath);
    const nodePrefix = win32.dirname(execPath);
    if (/^[A-Za-z]:\\?$/u.test(nodePrefix) || insideWin(home, nodePrefix) || insideWin(nodePrefix, root)) return { refused: `the Node install folder can't be granted: ${JSON.stringify(nodePrefix)}` };
    nodeFolder = nodePrefix;
    nodeFiles = [...new Set([execPath, ...NODE_FILE_ENTRIES.map((name) => win32.join(nodePrefix, name)).filter((path) => deps.host.exists(path))])];
    nodeDirs = NODE_DIR_ENTRIES.map((name) => win32.join(nodePrefix, name)).filter((path) => deps.host.exists(path));
    const gitPath = win32.join(root, ".git");
    // A worktree's .git is a file, so .git\HEAD can't exist under it.
    if (deps.host.exists(gitPath) && (deps.host.symlinkTarget(gitPath) !== null || deps.host.realpath(gitPath).toLowerCase() !== gitPath.toLowerCase() || !deps.host.exists(win32.join(gitPath, "HEAD")))) {
      return { refused: "the repository's .git is not a real folder (a worktree or a link), which --sandbox can't protect" };
    }
    if (deps.host.exists(win32.join(root, ".gitmodules"))) return { refused: "the repository has submodules, whose .git files --sandbox can't protect" };
    if (deps.host.exists(gitPath)) {
      const reach = windowsGitReachRefusalV1(gitPath, deps.host, deps.readText);
      if (reach !== null) return { refused: reach };
    }
    const hardLink = deps.findHardLink(root);
    if (hardLink !== null) {
      return { refused: `the repository contains a hard-linked file (${JSON.stringify(hardLink)}), which --sandbox can't safely grant` };
    }
    evidence = win32.join(root, ".ascout");
    ledgerPath = win32.join(evidence, "pending-acl-cleanup.json");
    evidenceStat = deps.lstatPath(evidence);
    if (
      evidenceStat !== null &&
      (evidenceStat.isSymbolicLink || !evidenceStat.isDirectory || deps.host.realpath(evidence).toLowerCase() !== evidence.toLowerCase())
    ) {
      return { refused: "the repository's .ascout is not a real folder, which --sandbox refuses" };
    }
    ledgerStat = deps.lstatPath(ledgerPath);
    if (ledgerStat !== null && (ledgerStat.isSymbolicLink || !ledgerStat.isFile || ledgerStat.nlink > 1n)) {
      return { refused: "the ACL cleanup ledger is not a plain single-link file, which --sandbox refuses" };
    }
    gitDir = deps.host.exists(gitPath) ? gitPath : null;
  } catch (error) {
    return { refused: errorMessage(error) };
  }
  const probe = await windowsAppContainerProbeRunnerV1(deps, "none");
  if ("refused" in probe) return { refused: probe.refused };

  if (evidenceStat === null) deps.host.makeDir(evidence);
  const name = deps.randomName();
  const scratch = deps.host.realpath(deps.host.makeTempDir());
  const runScript = win32.join(scratch, "run-task.ps1");
  const psArgs = (script: string) => ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script];

  // Replay any orphaned ACL cleanup ledger left by an earlier interrupted run before creating a new container.
  if (ledgerStat !== null) {
    let rawLedger: string;
    try {
      rawLedger = deps.readText(ledgerPath);
    } catch (error) {
      deps.host.removeDir(scratch);
      return { refused: errorMessage(error) };
    }
    const stale = parsePendingCleanupLedgerV1(rawLedger, root, nodeFolder);
    if (stale !== null) {
      const staleOut = (
        await deps.exec(powershell, psArgs(WINDOWS_TASK_CLEANUP_SCRIPT), {
          cwd: scratch,
          env: {
            SystemRoot: deps.systemRoot,
            PATHEXT: ".COM;.EXE",
            ASCOUT_AC_NAME: stale.name,
            ASCOUT_AC_WORKSPACE: stale.workspace,
            ASCOUT_AC_PATHS: stale.paths.join("|"),
          },
          timeoutMs: 120_000,
        })
      ).trim();
      if (staleOut !== "ASCOUT_CLEANUP_OK") {
        deps.host.removeDir(scratch);
        return { refused: "could not clean up orphaned ACL grants from an earlier sandboxed run" };
      }
    }
    deps.removeFile(ledgerPath);
  }

  const cleanupPaths = [root, ...(gitDir === null ? [] : [gitDir]), evidence, nodeFolder, ...nodeFiles, ...nodeDirs];
  const grantedResultDirs = new Set<string>();
  const psEnv = {
    SystemRoot: deps.systemRoot,
    PATHEXT: ".COM;.EXE",
    ASCOUT_AC_NAME: name,
    ASCOUT_AC_WORKSPACE: root,
    ASCOUT_AC_GITDIR: gitDir ?? "",
    ASCOUT_AC_EVIDENCE: evidence,
    ASCOUT_AC_NODEFOLDER: nodeFolder,
    ASCOUT_AC_NODEFILES: nodeFiles.join("|"),
    ASCOUT_AC_NODEDIRS: nodeDirs.join("|"),
    ASCOUT_AC_PATHS: cleanupPaths.join("|"),
  };
  const writeLedger = (): void => {
    deps.host.writeFile(ledgerPath, JSON.stringify({ name, workspace: root, paths: [...cleanupPaths, ...grantedResultDirs] }));
  };
  const afterTask = async (writable: readonly string[]): Promise<void> => {
    if (writable.length === 0) return;
    const revokeOut = (
      await deps.exec(powershell, psArgs(WINDOWS_TASK_REVOKE_SCRIPT), {
        cwd: scratch,
        env: {
          SystemRoot: deps.systemRoot,
          PATHEXT: ".COM;.EXE",
          ASCOUT_AC_NAME: name,
          ASCOUT_AC_WRITABLE: writable.join("|"),
        },
        timeoutMs: 60_000,
      })
    ).trim();
    if (revokeOut !== "ASCOUT_REVOKE_OK") {
      throw new Error("could not revoke task result-folder ACL grants");
    }
    for (const dir of writable) grantedResultDirs.delete(dir);
    writeLedger();
  };
  const dispose = async (): Promise<void> => {
    try {
      const cleanupOut = (
        await deps.exec(powershell, psArgs(WINDOWS_TASK_CLEANUP_SCRIPT), {
          cwd: scratch,
          env: { ...psEnv, ASCOUT_AC_PATHS: [...cleanupPaths, ...grantedResultDirs].join("|") },
          timeoutMs: 120_000,
        })
      ).trim();
      if (cleanupOut === "ASCOUT_CLEANUP_OK") {
        deps.removeFile(ledgerPath);
      }
    } finally {
      deps.host.removeDir(scratch);
    }
  };
  writeLedger();
  deps.host.writeFile(runScript, WINDOWS_TASK_RUN_SCRIPT);
  const acDir = (await deps.exec(powershell, psArgs(WINDOWS_TASK_SETUP_SCRIPT), { cwd: scratch, env: psEnv, timeoutMs: 600_000 })).trim();
  if (!win32.isAbsolute(acDir)) {
    await dispose();
    return { refused: "the AppContainer for tasks could not be created and granted" };
  }
  const allow64 = b64(allowedEnvNames.join("|"));
  const wrap = (file: string, argv: readonly string[], cwd: string, writable: readonly string[]) => {
    if (cwd.includes("/") || win32.normalize(cwd) !== cwd || !insideWin(cwd, root)) {
      throw new Error(`a sandboxed task must start inside the repository: ${JSON.stringify(cwd)}`);
    }
    for (const dir of writable) {
      if (dir.includes("/") || win32.normalize(dir) !== dir || !insideWin(dir, evidence) || dir.toLowerCase() === evidence.toLowerCase() || dir.includes("|")) {
        throw new Error(`a sandboxed result folder must lie inside .ascout: ${JSON.stringify(dir)}`);
      }
    }
    if (writable.length > 0) {
      for (const dir of writable) grantedResultDirs.add(dir);
      writeLedger();
    }
    const { app, commandLine } = windowsCommandLineV1(file, argv, nodeFolder);
    return {
      file: powershell,
      argv: ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", runScript, name, b64(app), b64(commandLine), b64(cwd), acDir, b64(writable.join("|")), allow64],
    };
  };
  let failed: string | null;
  try {
    failed = await selfTest(deps, wrap, afterTask, root, evidence, scratch);
  } catch (error) {
    failed = errorMessage(error);
  }
  if (failed !== null) {
    await dispose();
    return { refused: failed };
  }
  return { sandbox: { mechanism: "windows-appcontainer", wrap, afterTask, dispose } };
}

/**
 * Runs a probe through the real run script, in the real container and repository: every attempt must
 * be denied (including outside reads/writes, `.git`, `.ascout`, env canary, and host loopback) except
 * writing a throwaway result folder, which is revoked and removed afterwards.
 */
async function selfTest(
  deps: WindowsTaskSandboxDepsV1,
  wrap: (file: string, argv: readonly string[], cwd: string, writable: readonly string[]) => { readonly file: string; readonly argv: readonly string[] },
  afterTask: (writable: readonly string[]) => Promise<void>,
  root: string,
  evidence: string,
  scratch: string,
): Promise<string | null> {
  const results = win32.join(evidence, `selftest-${deps.randomName()}`, "raw", "test");
  const marker = win32.join(scratch, "outside-marker");
  const outsideWriteTarget = win32.join(scratch, "outside-write");
  const canaryName = `ASCOUT_SELFTEST_CANARY_${deps.randomName().replace(/[^A-Za-z0-9]/gu, "_")}`;
  deps.host.makeDir(win32.dirname(win32.dirname(results)));
  deps.host.makeDir(win32.dirname(results));
  deps.host.makeDir(results);
  deps.host.writeFile(marker, "outside");
  const loopback = await deps.loopbackPort();
  if (loopback === null) {
    deps.host.removeDir(win32.dirname(win32.dirname(results)));
    return "the AppContainer task sandbox self-test could not open a loopback probe port";
  }
  try {
    const script = [
      'const fs = require("node:fs");',
      'const attempt = (fn) => { try { fn(); return "allowed"; } catch (e) { return e.code || String(e); } };',
      `const out = { outside: attempt(() => fs.readFileSync(${JSON.stringify(marker)})), outsideWrite: attempt(() => fs.writeFileSync(${JSON.stringify(outsideWriteTarget)}, "x")), git: attempt(() => fs.writeFileSync(".git\\\\ascout-selftest", "x")), evidence: attempt(() => fs.readdirSync(".ascout")), results: attempt(() => fs.writeFileSync(${JSON.stringify(win32.join(results, "probe"))}, "x")), canary: process.env[${JSON.stringify(canaryName)}] === undefined ? "absent" : "leaked" };`,
      'const finish = (r) => { out.loopback = r; process.stdout.write(JSON.stringify(out)); process.exit(0); };',
      `const s = require("node:net").connect(${loopback.port}, "127.0.0.1"); s.on("data", () => finish("allowed")); s.on("error", () => finish("denied")); setTimeout(() => finish("denied"), 3000);`,
    ].join(" ");
    const launch = wrap(deps.host.realpath(deps.execPath), ["-e", script], root, [results]);
    const { stdout: output, stderr } = await deps.execBoth(launch.file, launch.argv, {
      cwd: root,
      env: { SystemRoot: deps.systemRoot, [canaryName]: "host-only" },
      timeoutMs: 120_000,
    });
    let seen: unknown;
    try {
      seen = JSON.parse(output);
    } catch {
      const detail = `${output}\n${stderr}`.replace(/\s+/gu, " ").trim().slice(-600);
      return `the AppContainer task sandbox did not start${detail === "" ? "" : ` (${detail})`}`;
    }
    if (JSON.stringify(seen) !== JSON.stringify(WINDOWS_SELF_TEST_EXPECTED)) return `the AppContainer task sandbox started but its self-test did not hold: ${JSON.stringify(seen)}`;
    return null;
  } finally {
    loopback.close();
    try {
      await afterTask([results]);
    } finally {
      deps.host.removeDir(win32.dirname(win32.dirname(results)));
    }
  }
}

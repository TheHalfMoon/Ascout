# FD-4: T1 isolation research (public)

**Status:** research and implementation work, approved by the founder on 2026-11-13. **It is not a
security certification.** Ascout's containment tier is still **T0**: code Ascout runs has the
caller's full rights (`src/assurance/containment/containment-tier.ts`). Nothing in this document, or in
the code it describes, changes that. Ascout will not claim T1, or say that it can run untrusted
code, until both of these exist:

1. native evidence from the probes below, on each host, showing every capability denied; and
2. an independent human security review of the host-specific design and its evidence.

An AI review does not count toward either.

This document is public on purpose and stays generic. The host-specific T1 spec includes
technique-level probes, and it stays private, as the T0 spec requires
(`E7A_TRUSTED_LOCAL_T0_SPEC.md`).

## Threat model

- **Asset:** the operator's machine and accounts, meaning files outside the checked-out workspace,
  credentials in the environment and on disk, and network reach (including loopback services and
  the local network).
- **Adversary:** the repository under check. Its tests, build scripts and dependencies run as
  `check` tasks. T1 assumes they may be hostile.
- **Out of scope for T1:** kernel exploits, hardware side channels, and denial of service against the
  host. A T1 claim will name these limits rather than imply they are covered.

## What T1 must remove

Each item is a capability the probes measure today. Under T0, all four are **ALLOWED**, and CI
proves that natively on Linux, macOS and Windows (`tests/containment-capability-probes.test.ts`).

| Probe id | Capability | T1 target |
|---|---|---|
| `read_outside_workspace` | Read a file outside the workspace | DENIED |
| `write_outside_workspace` | Create a file outside the workspace | DENIED |
| `loopback_network` | Connect to a loopback-only listener | DENIED |
| `environment_secret` | See a secret in the caller's environment | DENIED |

The probe's own report is never trusted alone. The parent checks every effect independently: the
canary's random content, the file on disk, the connection its listener saw, and the secret's digest.
A runner that claims a denial while the effect happened gets the verdict `INCONSISTENT`, and so does
a runner that reports nothing. Tests prove both.

The four probes are the minimum, not the full T1 bar. The private host-specific spec adds
technique-level probes for each mechanism.

## Candidate mechanisms and their known limits

These are directions to evaluate, not choices. Each one needs its own native evidence.

- **Linux.** Unprivileged user and mount namespaces, a network namespace with no interfaces, and
  Landlock for filesystem rules, plus seccomp to reduce the kernel's attack surface.
  - *Limits:* some distributions and CI images restrict unprivileged user namespaces. Landlock
    support depends on the kernel version. Each one must be detected, never assumed.
- **macOS.** The system sandbox profile facility.
  - *Limits:* it is officially deprecated, and its profile language is undocumented and could
    change. Its network rules are coarse.
- **Windows.** AppContainer or a restricted token, with a Job object, plus network isolation through
  the firewall or AppContainer capabilities.
  - *Limits:* ordinary tooling (Node, Git, compilers) often fails under AppContainer without broad
    file grants, and each grant weakens the boundary. Firewall rules are a system setting, and Ascout
    must not change them silently.
- **Cross-platform alternatives.** A container or a lightweight VM.
  - *Limits:* this depends on software the operator must install. It changes what "the operator's
    tests" means, and it needs its own trust story for the image.

On every host, the environment is the easiest capability to remove: the runner passes an
allowlisted environment instead of the caller's. It is probably the first T1 control to ship, but on
its own it is not T1.

## Phased plan

1. **Probes (built, #756).** Generic capability probes, run natively in CI on all three operating
   systems. They assert T0's truth: everything is allowed.
2. **T1-ENV (built).** `ascout check --clean-env [--pass-env NAME]...` gives every `check` task an
   allowlisted environment. It is an explicit per-invocation opt-in and is never read from repository
   configuration (`src/assurance/containment/task-environment.ts`). Under it, the native probes show
   `environment_secret` DENIED and the other three capabilities still ALLOWED, on every CI host. No
   tier change: the tier stays T0.
   - **Limit:** the probe measures *inheritance*. A same-user task can still recover the secret from
     Ascout's own process (`/proc/<pid>/environ` on Linux, the process arguments on macOS, process
     memory on Windows) and read credential files under the home folder. Removing those needs the
     secrets out of Ascout's process before launch, or a different user or sandbox: that is T1-FS
     and later work, not T1-ENV.
3. **T1-FS first.** Filesystem isolation, one host at a time, starting with Linux. Read and write
   outside the workspace go to DENIED. Each host's design goes into the private host-specific spec.
   - **Linux (research runner built):** `src/assurance/containment/linux-fs-sandbox.ts`.
     - It uses bubblewrap, unprivileged, from a fixed system path only. The sandbox root starts
       empty. Inside it are the system folders and the Node binary (read-only), a fresh `/tmp`, and
       the workspace, the only host location a task can write. There are new PID, IPC and UTS
       namespaces, and the sandbox stops when its parent does.
     - It refuses a workspace that is, or contains, a protected location (`/`, `/tmp`, `/home`, the
       home folder, `/proc`, `/dev`, and others), or that lies inside a kernel or system tree.
     - It refuses, never falls back, when bubblewrap is missing or a self-test fails. The self-test
       checks that a marker beside an empty workspace is invisible from inside.
     - Linux CI installs bubblewrap and requires the native probes to show both filesystem
       capabilities DENIED for a sibling path outside the workspace, with loopback and environment
       still ALLOWED. Other escape classes are probed privately.
     - **Not wired into any command yet**, and the tier stays T0.
   - **Known limits:**
     - `/etc` and the Node binary stay readable.
     - The network is shared (T1-NET), and that includes local sockets.
     - Bubblewrap's own process is visible inside the sandbox and holds the environment it was
       started with, so it is started with exactly the task's environment.
     - Kernel exploits are out of scope.

     Technique-level probes and their results are in the private Linux host spec. A Linux T1-FS
     claim still needs an independent human security review.
4. **T1-NET.** Network isolation per host.
   - **Linux (research option built):** the bubblewrap runner takes `network: "none"`, which gives
     the task its own empty network namespace. It then reaches neither the host's loopback services
     and local sockets nor any other host. The default stays shared.
   - With it, plus the filesystem sandbox and an allowlisted environment, Linux CI requires **all
     four** native capability probes DENIED (`all_denied: true`).
   - That is research evidence, not a claim. The tier stays T0, and nothing in Ascout uses it yet.
     A claim still needs the independent human security review in step 5.
5. **Review and claim.** When every probe is DENIED natively on a host, and an independent human
   security review accepts that host's design and evidence, the tier record may say T1 for that
   host only. Until then it says T0.

## Evidence bar for a T1 claim

- Every probe `DENIED` with the parent's agreement (`all_denied: true`), natively on that host in
  CI, on every supported Node version.
- The private technique-level probes are also denied.
- An independent human security review of the design and evidence, recorded with the reviewer's
  identity. AI review does not satisfy it.
- The claim names its host, its mechanism, and its known limits.
- Any regression in a probe fails CI and withdraws the claim.

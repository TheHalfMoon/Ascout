# Specification 005 Measured Gap Evidence

**Canonical comparison base:** `7bede70ad2abfb91dc9186fb44d77a824efbfdef`

## Product receipt observation

Current `RunReceiptV1` records:

- `run_id`
- `ascout_version`
- `started_at`
- `finished_at`
- `config_digest`

Current task results separately record `tool_name` and `tool_version`.

There is no run-level receipt field for:

- Node runtime version;
- OS/platform;
- architecture;
- package-manager identity/version;
- effective lockfile digest.

## Existing benchmark evidence discipline

The repository benchmark harness already records environment context including OS, Node version, and package-manager identity/version for benchmark observations. This demonstrates that the repository already treats those dimensions as relevant reproducibility context outside the product receipt.

## Gap classification

`PRESENT_AND_MEASURABLE`

The gap is not that Ascout lacks a host fingerprint or environment inventory. The bounded gap is that product receipts cannot currently distinguish otherwise identical verification observations produced under materially different basic runtime/toolchain environments using the same level of environment context already retained by the benchmark system.

## Promotion decision

Promote only the smallest M1.1-B slice:

- runtime/OS/arch;
- existing-discovery package-manager identity/version where available without execution;
- one effective supported lockfile digest where safely available.

Do not promote function coverage, environment orchestration, dependency inventory, executable probing, or M2 capabilities from this evidence.
param([Parameter(Mandatory=$true)][string]$VerifiedClosingHead)
$ErrorActionPreference = 'Stop'
function Read-Sha256([string]$LiteralPath) {
  $stream = [IO.File]::OpenRead($LiteralPath)
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-','').ToLowerInvariant() }
  finally { $algorithm.Dispose(); $stream.Dispose() }
}
if ($VerifiedClosingHead -cnotmatch '^[a-f0-9]{40}$') { throw 'Invalid expected evidence commit' }
$taskWorkspaceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).ProviderPath
$taskRepo = (Resolve-Path -LiteralPath (Join-Path $taskWorkspaceRoot 'work/engineering/durability')).ProviderPath
$expectedRepo = [IO.Path]::GetFullPath((Join-Path $taskWorkspaceRoot 'work/engineering/durability'))
if (!$taskRepo.Equals($expectedRepo, [StringComparison]::OrdinalIgnoreCase)) { throw 'Wrong repository path' }
$expectedTarget = [IO.Path]::GetFullPath((Join-Path $taskRepo 'node_modules'))
$target = (Resolve-Path -LiteralPath $expectedTarget).ProviderPath
if (!$target.Equals($expectedTarget, [StringComparison]::OrdinalIgnoreCase) -or !$target.StartsWith($taskRepo + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Outside owned install' }
if ((Get-Item -LiteralPath $target -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Reparse root' }
$items = @(Get-ChildItem -LiteralPath $target -Recurse -Force)
if (@($items | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) { throw 'Reparse descendant; leave install intact' }
$runsRoot = Join-Path $taskWorkspaceRoot 'work/engineering/runs'
foreach ($capture in Get-ChildItem -LiteralPath $runsRoot -Filter 'durable-harness-*.json') {
  $run = Get-Content -LiteralPath $capture.FullName -Raw | ConvertFrom-Json
  if ($run.state -eq 'RUNNING') { throw 'Owned task capture still active' }
}
$receiptPath = Join-Path $PSScriptRoot ('publication-receipt-' + $VerifiedClosingHead.Substring(0,7) + '.json')
$receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
if ($receipt.head -cne $VerifiedClosingHead -or $receipt.branch -cne 'evidence/durable-harness-postmerge-20261024' -or !$receipt.remote_ref_verified -or !$receipt.remote_bytes_equal_local -or !$receipt.all_member_hashes_crc_json_python_verified) { throw 'Closing remote proof absent' }
$packetRoot = Join-Path $taskRepo 'qualification/durable-harness/2026-10-24-closeout'
$zipPath = Join-Path $packetRoot 'evidence.zip'
if ((Read-Sha256 $zipPath) -cne $receipt.files.'evidence.zip'.sha256) { throw 'Archive differs from verified remote bytes' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $reader = [IO.StreamReader]::new($archive.GetEntry('MANIFEST.json').Open())
  try { $manifest = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
} finally { $archive.Dispose() }
$installs = @(Get-ChildItem -LiteralPath $runsRoot -Filter 'durable-harness-install-*.json')
if ($installs.Count -ne 1) { throw 'Ambiguous owned installation evidence' }
$install = Get-Content -LiteralPath $installs[0].FullName -Raw | ConvertFrom-Json
if ($install.state -cne 'EXECUTED' -or $install.exit -ne 0) { throw 'Installation did not finish successfully' }
$installHash = Read-Sha256 $installs[0].FullName
$entry = @($manifest.records | Where-Object { $_.path -ceq ('runs/' + $installs[0].Name) })
if ($entry.Count -ne 1 -or $entry[0].original_sha256 -cne $installHash) { throw 'Owned install evidence absent from verified remote ZIP' }
$lockHash = Read-Sha256 (Join-Path $taskRepo 'package-lock.json')
$installedLockHash = Read-Sha256 (Join-Path $target '.package-lock.json')
$files = @($items | Where-Object { !$_.PSIsContainer })
$bytes = ($files | Measure-Object -Property Length -Sum).Sum
$record = @{ action='REMOVE_ONLY_FINISHED_TASK020_DISPOSABLE_DEPENDENCY_INSTALL'; target='work/engineering/durability/node_modules'; verified_closing_head=$VerifiedClosingHead; archive_sha256=$receipt.files.'evidence.zip'.sha256; original_install_capture=$installs[0].Name; original_install_capture_sha256=$installHash; package_lock_sha256=$lockHash; installed_metadata_sha256=$installedLockHash; files=$files.Count; logical_bytes=$bytes; owned_capture_running=$false; root_and_descendant_reparse_points=$false; source_and_raw_evidence_retained=$true; active_worktrees_removed=$false; processes_terminated=$false; limits='Owned completed-task capture inventory checked; no global process ownership, resource diagnosis or release readiness claim. Dependencies remain reproducible from unchanged lockfile.' }
try {
  Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
  if (Test-Path -LiteralPath $target) { throw 'Removal incomplete' }
  $record.result = 'REMOVED'
} catch {
  $record.result = 'REMOVAL_FAILED_OR_PARTIAL'
  $record.failure_kind = $_.Exception.GetType().FullName
  throw
} finally {
  $record.at_utc = [DateTime]::UtcNow.ToString('o')
  $json = $record | ConvertTo-Json -Depth 6
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot 'qualification-owned-install-cleanup.json'), $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
  Write-Output $json
}

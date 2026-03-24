param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$VitestArgs
)

$ErrorActionPreference = 'Stop'

if (-not $VitestArgs -or $VitestArgs.Count -eq 0) {
  $VitestArgs = @('run')
}

$nodeCandidates = @()

$nodeFromPath = Get-Command node -ErrorAction SilentlyContinue
if ($nodeFromPath) {
  $nodeCandidates += $nodeFromPath.Source
}

$nodeCandidates += @(
  "$env:ProgramFiles\cursor\resources\app\resources\helpers\node.exe",
  "$env:LOCALAPPDATA\Programs\Microsoft VS Code\node.exe",
  "$env:ProgramFiles\Microsoft VS Code\node.exe",
  "$env:LOCALAPPDATA\Programs\Cursor\node.exe"
)

$nodeExe = $nodeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $nodeExe) {
  throw "Node.js executable not found. Install Node.js or ensure Cursor/VS Code bundled node is available."
}

$launcher = Join-Path $PSScriptRoot 'vitest-no-spawn.mjs'
& $nodeExe $launcher @VitestArgs
exit $LASTEXITCODE

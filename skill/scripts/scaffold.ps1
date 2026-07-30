[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$VideoPath,

  [Parameter(Mandatory = $true)]
  [string]$ProjectDir,

  [string]$Title = "Talking Head Social Video",

  [string]$CompositionId = "talking-head-social-video"
)

$ErrorActionPreference = "Stop"

& node (Join-Path $PSScriptRoot "scaffold.mjs") `
  --video $VideoPath `
  --project $ProjectDir `
  --title $Title `
  --id $CompositionId

if ($LASTEXITCODE -ne 0) {
  throw "Scaffold failed with exit code $LASTEXITCODE."
}

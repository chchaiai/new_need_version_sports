$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$repoRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$backendRoot=Join-Path $repoRoot 'BNBU-Sports-Backend'
$output=Join-Path $PSScriptRoot 'P7-H-A-consolidated-source-evidence-20260909-1612.zip'
if(Test-Path -LiteralPath $output){throw 'Refusing to overwrite an existing handoff ZIP'}
$paths=[Collections.Generic.List[string]]::new()
foreach($module in @('exercise-session','media-evidence','exercise-record')){
  Get-ChildItem -LiteralPath (Join-Path $backendRoot "src/modules/$module") -File -Recurse | ForEach-Object {
    if($_.Extension -ne '.ts'){throw "Unexpected module file: $($_.Name)"}
    $paths.Add($_.FullName)
  }
}
foreach($name in @('1500_exercise_session.sql','1510_session_command_replay.sql','1600_record_media_assets.sql','1700_first_record_material.sql','1710_record_command_state.sql')){
  $paths.Add((Join-Path $backendRoot "migrations/$name"))
}
foreach($name in @('P7-H-A-to-Z-consolidated-handoff-20260909.md','H-A-submission-checkpoint.md',
  'session-postgres.test.mjs','inspect-architecture.mjs','h-a-current-architecture-diagnosis.json',
  'h-a-submission-postgres-final.tap','h-a-submission-unit-complete.tap','build-consolidated-handoff.ps1')){
  $paths.Add((Join-Path $PSScriptRoot $name))
}
Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'z-v1.3-migration-dependencies') -File | ForEach-Object {
  if($_.Extension -ne '.sql'){throw 'Unexpected migration fixture'}
  $paths.Add($_.FullName)
}
$entries=@($paths | Sort-Object -Unique | ForEach-Object {
  $absolute=[IO.Path]::GetFullPath($_)
  if(!$absolute.StartsWith($repoRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Path escaped repository'}
  $relative=[IO.Path]::GetRelativePath($repoRoot,$absolute).Replace('\','/')
  if($relative -match '(\.env|\.git/|node_modules/|\.(pem|key|p12|pfx|jks)$)'){throw 'Excluded sensitive or dependency path'}
  [pscustomobject]@{path=$relative;bytes=(Get-Item -LiteralPath $absolute).Length;sha256=(Get-FileHash -LiteralPath $absolute -Algorithm SHA256).Hash.ToLowerInvariant();source=$absolute}
})
$manifest=[ordered]@{status='PARTIAL_NOT_TRACK_READY';createdAt=[DateTimeOffset]::Now.ToString('o');
  baseCommit='f95c3833870fe0da55a297aa28c958ec53e9e935';sourceState='UNCOMMITTED_H_CANDIDATE';
  contractSha256='5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed';
  checks=@{postgresHttp=44;nativeUnit=92;failed=0;skipped=0;realZIntegration='NOT_RUN';realStorage='NOT_RUN';officialArchitectureGate=$false};
  files=@($entries|Select-Object path,bytes,sha256)}
$zip=[IO.Compression.ZipFile]::Open($output,[IO.Compression.ZipArchiveMode]::Create)
try{
  foreach($entry in $entries){[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$entry.source,$entry.path,[IO.Compression.CompressionLevel]::Optimal)|Out-Null}
  $manifestEntry=$zip.CreateEntry('SOURCE-MANIFEST.json')
  $writer=[IO.StreamWriter]::new($manifestEntry.Open(),[Text.UTF8Encoding]::new($false))
  try{$writer.Write(($manifest|ConvertTo-Json -Depth 8))}finally{$writer.Dispose()}
}finally{$zip.Dispose()}
$zip=[IO.Compression.ZipFile]::OpenRead($output)
try{
  if($zip.Entries.Count -ne $entries.Count+1){throw 'Archive entry count mismatch'}
  foreach($entry in $entries){
    $actual=$zip.GetEntry($entry.path)
    if(!$actual -or $actual.Length -ne $entry.bytes){throw "Length mismatch: $($entry.path)"}
    $stream=$actual.Open()
    try{$hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)).ToLowerInvariant()}finally{$stream.Dispose()}
    if($hash -ne $entry.sha256){throw "Hash mismatch: $($entry.path)"}
    if((Get-FileHash -LiteralPath $entry.source).Hash.ToLowerInvariant() -ne $entry.sha256){throw 'Source changed during packaging'}
  }
}finally{$zip.Dispose()}
[pscustomobject]@{path=$output;payloadFiles=$entries.Count;archiveEntries=$entries.Count+1;verified=$true;sha256=(Get-FileHash -LiteralPath $output).Hash.ToLowerInvariant()}|ConvertTo-Json

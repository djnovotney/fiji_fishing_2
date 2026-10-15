$ErrorActionPreference = "Stop"

Add-Type -Path (Join-Path $PSScriptRoot "FishGlbGenerator.cs")
$asset = [FishGlbGenerator]::Generate()
$json = ConvertTo-Json -InputObject $asset -Depth 100 -Compress
$jsonBytes = [Text.Encoding]::UTF8.GetBytes($json)
while (($jsonBytes.Length % 4) -ne 0) {
  $jsonBytes += [byte]0x20
}

$binary = [FishGlbGenerator]::GetBinary()
while (($binary.Length % 4) -ne 0) {
  $binary += [byte]0
}

$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($stream)
$writer.Write([uint32]0x46546C67)
$writer.Write([uint32]2)
$writer.Write([uint32](12 + 8 + $jsonBytes.Length + 8 + $binary.Length))
$writer.Write([uint32]$jsonBytes.Length)
$writer.Write([uint32]0x4E4F534A)
$writer.Write($jsonBytes)
$writer.Write([uint32]$binary.Length)
$writer.Write([uint32]0x004E4942)
$writer.Write($binary)
$writer.Flush()

$output = Join-Path (Split-Path $PSScriptRoot -Parent) "assets\fiji-trevally-procedural-preview.glb"
[IO.File]::WriteAllBytes($output, $stream.ToArray())
$writer.Dispose()
$stream.Dispose()
Write-Output "Generated $output ($((Get-Item -LiteralPath $output).Length) bytes)"

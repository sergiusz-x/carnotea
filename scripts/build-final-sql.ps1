$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sqlDir = Join-Path $root "sql"
$distDir = Join-Path $root "dist"
$output = Join-Path $distDir "imie_nazwisko_projekt.sql"

$files = @(
    "00_schema_reset.sql",
    "01_tables.sql",
    "02_indexes.sql",
    "03_functions.sql",
    "04_triggers.sql",
    "05_procedures.sql",
    "06_views.sql",
    "07_seed_data.sql",
    "08_demo_calls.sql"
)

New-Item -ItemType Directory -Force -Path $distDir | Out-Null

$content = for ($i = 0; $i -lt $files.Count; $i++) {
    $file = $files[$i]
    $path = Join-Path $sqlDir $file

    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing SQL file: $path"
    }

    if ($i -gt 0) {
        "-- ============================================================"
        "-- Source: sql/$file"
        "-- ============================================================"
    }

    Get-Content -Raw -LiteralPath $path
    ""
}

$content | Set-Content -LiteralPath $output -Encoding UTF8

Write-Host "Generated $output"

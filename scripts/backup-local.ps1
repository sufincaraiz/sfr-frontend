<#
.SYNOPSIS
    Copia de seguridad manual de la base de Su Finca Raíz, para correr antes de
    un cambio grande.

.DESCRIPTION
    Genera backups\sfr-AAAA-MM-DD-HHmm.sql.gz.

    SOBRE LA CONTRASEÑA: se lee de .env.local dentro del script y se pasa a
    pg_dump por la variable de entorno PGPASSWORD, nunca como argumento. Así no
    queda ni en el historial de PowerShell ni en la línea de comandos del
    proceso (que cualquier otro programa del equipo puede leer). Al terminar se
    borra de la sesión.

    EL ARCHIVO CONTIENE CÉDULAS. Está cubierto por .gitignore, pero si lo mueves
    fuera de la carpeta del proyecto, trátalo como el dato personal que es.

.EXAMPLE
    .\scripts\backup-local.ps1
#>

[CmdletBinding()]
param(
    # Carpeta destino. Por defecto backups\ dentro del proyecto (ya en .gitignore).
    [string]$Destino = (Join-Path $PSScriptRoot '..\backups')
)

$ErrorActionPreference = 'Stop'

# ── 1. pg_dump disponible y de la versión correcta ───────────────────────────
# El servidor es PostgreSQL 18. pg_dump se NIEGA a volcar desde un servidor de
# versión mayor que la suya, así que una instalación de PG 16 o 17 no sirve.
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Write-Host "pg_dump no está instalado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Instálalo con las herramientas de cliente de PostgreSQL 18:"
    Write-Host "    winget install PostgreSQL.PostgreSQL.18"
    Write-Host ""
    Write-Host "Después abre una terminal nueva (para que tome el PATH) y vuelve a correr esto."
    exit 1
}

$versionTexto = (& pg_dump --version) -join ' '
if ($versionTexto -match '(\d+)\.') { $major = [int]$Matches[1] } else { $major = 0 }
if ($major -lt 18) {
    Write-Host "pg_dump es versión $major, pero el servidor es PostgreSQL 18." -ForegroundColor Red
    Write-Host "pg_dump no puede volcar desde un servidor más nuevo que él. Instala PostgreSQL 18:"
    Write-Host "    winget install PostgreSQL.PostgreSQL.18"
    exit 1
}

# ── 2. Leer DATABASE_URL sin exponerla ───────────────────────────────────────
$envFile = Join-Path $PSScriptRoot '..\.env.local'
if (-not (Test-Path $envFile)) { throw "No se encontró .env.local en $envFile" }

$linea = Select-String -Path $envFile -Pattern '^DATABASE_URL' | Select-Object -First 1
if (-not $linea) { throw "No hay DATABASE_URL en .env.local" }

$url = $linea.Line.Split('=', 2)[1].Trim().Trim('"').Trim("'")
$uri = [System.Uri]$url

$pgHost = $uri.Host
$pgPort = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
$pgBase = $uri.AbsolutePath.TrimStart('/')
$partes = $uri.UserInfo.Split(':', 2)
$pgUser = [System.Uri]::UnescapeDataString($partes[0])
$pgPass = if ($partes.Count -gt 1) { [System.Uri]::UnescapeDataString($partes[1]) } else { '' }

Write-Host "Servidor: $pgHost`:$pgPort  ·  base: $pgBase  ·  usuario: $pgUser"

# ── 3. Volcado ───────────────────────────────────────────────────────────────
if (-not (Test-Path $Destino)) { New-Item -ItemType Directory -Path $Destino -Force | Out-Null }
$Destino = (Resolve-Path $Destino).Path

$sello   = Get-Date -Format 'yyyy-MM-dd-HHmm'
$temporal = Join-Path $Destino "sfr-$sello.sql"
$final    = Join-Path $Destino "sfr-$sello.sql.gz"

$env:PGPASSWORD = $pgPass
try {
    Write-Host "Volcando…"
    # --no-owner / --no-privileges: el dump se restaura en cualquier servidor sin
    # depender de que existan los mismos roles que en Railway.
    & pg_dump --host=$pgHost --port=$pgPort --username=$pgUser --dbname=$pgBase `
              --no-owner --no-privileges --format=plain --encoding=UTF8 `
              --file=$temporal
    if ($LASTEXITCODE -ne 0) { throw "pg_dump falló con código $LASTEXITCODE" }
}
finally {
    # Que la contraseña no sobreviva a la ejecución, ni siquiera si algo falla.
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

# ── 4. Comprimir (GZipStream de .NET: no hace falta gzip en Windows) ─────────
Write-Host "Comprimiendo…"
$entrada = [System.IO.File]::OpenRead($temporal)
$salida  = [System.IO.File]::Create($final)
$gzip    = New-Object System.IO.Compression.GZipStream($salida, [System.IO.Compression.CompressionLevel]::Optimal)
try   { $entrada.CopyTo($gzip) }
finally { $gzip.Dispose(); $salida.Dispose(); $entrada.Dispose() }

Remove-Item $temporal -Force

$mb = [math]::Round((Get-Item $final).Length / 1MB, 2)
Write-Host ""
Write-Host "Listo: $final  ($mb MB)" -ForegroundColor Green
Write-Host "Contiene datos personales. No lo subas a ningún sitio sin cifrar."
Write-Host ""
Write-Host "Para restaurar en otra base:"
Write-Host "    gzip -d sfr-$sello.sql.gz"
Write-Host "    psql --host=... --username=... --dbname=... --file=sfr-$sello.sql"

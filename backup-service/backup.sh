#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Copia de seguridad semanal: Postgres (Railway) → Cloudflare R2.
#
# Es la ÚNICA copia de la base, así que el guion está escrito para fallar
# ruidosamente y nunca a medias. Cada paso comprueba su resultado, y al final el
# archivo se vuelve a descargar de R2, se descomprime y se lee para confirmar
# que es un dump restaurable. Un backup que no se ha verificado es una
# suposición, no un respaldo.
#
# Flujo:  pg_dump → gzip → subida a R2 → descarga + gunzip + lectura
#
# SIN CIFRADO PROPIO, por decisión explícita: la prioridad es que restaurar sea
# lo más simple posible el día que haga falta. La confidencialidad descansa en
# el cifrado en reposo de R2 y en que el bucket sea privado con credenciales
# limitadas a él. El archivo contiene cédulas: quien tenga las llaves de R2 lee
# los datos, así que esas llaves son tan sensibles como la base misma.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

export TZ="${TZ:-America/Bogota}"

log()   { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*"; }
error() { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] ERROR: $*" >&2; }

# ─── Aviso de fallo por Telegram ─────────────────────────────────────────────
# Se dispara en CUALQUIER salida distinta de cero, venga de donde venga.
FASE="inicio"
al_fallar() {
  code=$?
  [ "$code" -eq 0 ] && exit 0
  error "El backup FALLÓ en la fase: ${FASE} (código ${code})"

  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl --silent --show-error --max-time 20 \
         -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
         --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
         --data-urlencode "text=⚠️ Su Finca Raíz — el backup de la base FALLÓ.

Fase: ${FASE}
Código: ${code}
Fecha: $(date '+%Y-%m-%d %H:%M %Z')

Revisa los logs del servicio backup en Railway." \
         >/dev/null 2>&1 || error "Además, no se pudo avisar por Telegram."
  else
    error "Sin TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID: no se envió aviso."
  fi
  exit "$code"
}
trap al_fallar EXIT

# ─── 1. Comprobaciones previas ───────────────────────────────────────────────
FASE="comprobación de variables"
faltan=""
for v in DATABASE_URL R2_ENDPOINT R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
  if [ -z "${!v:-}" ]; then faltan="$faltan $v"; fi
done
if [ -n "$faltan" ]; then
  error "Faltan variables de entorno:$faltan"
  exit 1
fi

# Quita la barra final del endpoint si la trae, para no formar URLs con "//".
R2_ENDPOINT="${R2_ENDPOINT%/}"

log "Servicio de backup — Su Finca Raíz"
log "Destino: ${R2_BUCKET} en ${R2_ENDPOINT}"

# ─── 2. Conexión y versiones ─────────────────────────────────────────────────
FASE="conexión a la base"
if ! server_num="$(psql "$DATABASE_URL" -tAc 'SHOW server_version_num' 2>/dev/null)"; then
  error "No se pudo conectar a la base. Revisa DATABASE_URL."
  exit 1
fi
server_major=$(( server_num / 10000 ))

cliente_version="$(pg_dump --version)"
# Primer token que empieza por dígito: aguanta "… 18.4" y "… 18.4 (Debian …)".
cliente_major="$(printf '%s' "$cliente_version" | tr ' ' '\n' | grep -m1 '^[0-9]' | cut -d. -f1)"
case "$cliente_major" in
  ''|*[!0-9]*) error "No se pudo leer la versión de pg_dump: '${cliente_version}'"; exit 1 ;;
esac

log "Servidor PostgreSQL: ${server_major}  ·  pg_dump: ${cliente_major}"

# pg_dump no puede volcar desde un servidor MÁS NUEVO que él. Es el motivo por el
# que este servicio existe en vez de usar una plantilla.
if [ "$cliente_major" -lt "$server_major" ]; then
  error "pg_dump es versión ${cliente_major} y el servidor es ${server_major}."
  error "Un cliente más viejo NO puede volcar esta base. Actualiza la etiqueta"
  error "de la imagen en el Dockerfile a postgres:${server_major}-trixie."
  exit 1
fi

# ─── 3. Volcado ──────────────────────────────────────────────────────────────
FASE="pg_dump"
FECHA="$(date '+%Y-%m-%d')"
SQL="/tmp/sfr-backup-${FECHA}.sql"
GZ="${SQL}.gz"
NOMBRE="sfr-backup-${FECHA}.sql.gz"

log "Volcando la base…"
# --no-owner / --no-privileges: el dump se restaura en cualquier servidor sin
# necesitar que existan los mismos roles que en Railway. Es lo que permite que
# la restauración sea un solo comando de psql.
pg_dump "$DATABASE_URL" \
  --no-owner --no-privileges \
  --format=plain --encoding=UTF8 \
  --file="$SQL"

[ -s "$SQL" ] || { error "pg_dump produjo un archivo vacío."; exit 1; }

# Un dump cortado a media descarga también deja archivo. La última línea de un
# volcado completo es siempre este marcador de pg_dump.
if ! tail -n 20 "$SQL" | grep -q 'PostgreSQL database dump complete'; then
  error "El dump está incompleto: falta el marcador de cierre de pg_dump."
  exit 1
fi

TABLAS_ORIGEN="$(grep -c '^CREATE TABLE' "$SQL" || true)"
log "Dump correcto: $(wc -c < "$SQL") bytes, ${TABLAS_ORIGEN} tablas."

# ─── 4. Compresión ───────────────────────────────────────────────────────────
FASE="compresión"
gzip -9 "$SQL"
[ -s "$GZ" ] || { error "La compresión no produjo salida."; exit 1; }

TAM="$(wc -c < "$GZ")"
SHA_LOCAL="$(sha256sum "$GZ" | cut -d' ' -f1)"
log "Comprimido: ${TAM} bytes  ·  sha256 ${SHA_LOCAL}"

# ─── 5. Subida a R2 ──────────────────────────────────────────────────────────
FASE="subida a R2"
URL="${R2_ENDPOINT}/${R2_BUCKET}/${NOMBRE}"

# Las credenciales van por un archivo de configuración leído de la entrada
# estándar, no como argumentos: así no aparecen en la lista de procesos.
log "Subiendo ${NOMBRE}…"
printf 'user = "%s:%s"\n' "$R2_ACCESS_KEY_ID" "$R2_SECRET_ACCESS_KEY" | \
  curl --config - \
       --fail --silent --show-error \
       --retry 3 --retry-delay 5 --max-time 300 \
       --aws-sigv4 'aws:amz:auto:s3' \
       --upload-file "$GZ" \
       "$URL"

log "Subida completada."

# ─── 6. Verificación: descargar, descomprimir y LEER ─────────────────────────
# El paso que convierte esto en un backup de verdad. No basta con que la subida
# no diera error: hay que confirmar que lo que quedó en R2 se puede volver a
# convertir en un dump restaurable.
FASE="verificación de la copia en R2"
VERIF_GZ="/tmp/verificacion.sql.gz"
VERIF_SQL="/tmp/verificacion.sql"
rm -f "$VERIF_GZ" "$VERIF_SQL"

log "Descargando de vuelta para verificar…"
printf 'user = "%s:%s"\n' "$R2_ACCESS_KEY_ID" "$R2_SECRET_ACCESS_KEY" | \
  curl --config - \
       --fail --silent --show-error \
       --retry 3 --retry-delay 5 --max-time 300 \
       --aws-sigv4 'aws:amz:auto:s3' \
       --output "$VERIF_GZ" \
       "$URL"

# 6a. Idéntico byte a byte
SHA_REMOTO="$(sha256sum "$VERIF_GZ" | cut -d' ' -f1)"
if [ "$SHA_LOCAL" != "$SHA_REMOTO" ]; then
  error "El archivo en R2 NO coincide con el original."
  error "  local:  ${SHA_LOCAL}"
  error "  remoto: ${SHA_REMOTO}"
  exit 1
fi

# 6b. Se descomprime sin errores
if ! gzip -t "$VERIF_GZ" 2>/dev/null; then
  error "El archivo descargado de R2 no es un gzip válido."
  exit 1
fi
gzip -d -c "$VERIF_GZ" > "$VERIF_SQL"

# 6c. Y lo que sale es un dump completo y legible
if ! head -n 30 "$VERIF_SQL" | grep -q 'PostgreSQL database dump'; then
  error "El contenido descargado no parece un dump de PostgreSQL."
  exit 1
fi
if ! tail -n 20 "$VERIF_SQL" | grep -q 'PostgreSQL database dump complete'; then
  error "El dump en R2 está incompleto: falta el marcador de cierre."
  exit 1
fi

TABLAS_VERIF="$(grep -c '^CREATE TABLE' "$VERIF_SQL" || true)"
if [ "$TABLAS_VERIF" != "$TABLAS_ORIGEN" ]; then
  error "El dump en R2 tiene ${TABLAS_VERIF} tablas y el original ${TABLAS_ORIGEN}."
  exit 1
fi

# ─── 6d. Inventario: cuántos registros lleva realmente el respaldo ───────────
# Se cuenta sobre el archivo DESCARGADO DE R2, no sobre la base viva: lo que
# interesa es qué hay dentro del respaldo que acaba de quedar guardado.
#
# En un dump plano cada tabla se escribe como:
#     COPY public.tabla (col, col, …) FROM stdin;
#     …una línea por registro…
#     \.
# así que basta con contar las líneas entre ambos marcadores.
FASE="inventario del respaldo"
CONTEOS="/tmp/conteos.txt"
awk '
  /^COPY .* FROM stdin;$/ { t = $2; sub(/^public\./, "", t); n = 0; dentro = 1; next }
  dentro && $0 == "\\."    { print t "\t" n; dentro = 0; next }
  dentro                   { n++ }
' "$VERIF_SQL" | sort > "$CONTEOS"

filas_de() {
  awk -F'\t' -v t="$1" '$1 == t { print $2; encontrada = 1 } END { if (!encontrada) print 0 }' "$CONTEOS"
}

TOTAL_FILAS="$(awk -F'\t' '{ s += $2 } END { print s + 0 }' "$CONTEOS")"
N_PROPIEDADES="$(filas_de properties)"
N_LEADS="$(filas_de leads)"
N_VISITAS="$(filas_de visitas)"
N_TIPOS="$(filas_de property_types)"

log "─── Contenido del respaldo ───"
log "  tablas:            ${TABLAS_VERIF}"
log "  registros totales: ${TOTAL_FILAS}"
log "  propiedades:       ${N_PROPIEDADES}"
log "  tipos de inmueble: ${N_TIPOS}"
log "  leads:             ${N_LEADS}"
log "  visitas:           ${N_VISITAS}"
log "  (detalle por tabla)"
while IFS="$(printf '\t')" read -r tabla filas; do
  log "     $(printf '%-24s %8s' "$tabla" "$filas")"
done < "$CONTEOS"

# Un respaldo con el catálogo vacío es casi con seguridad un fallo silencioso:
# la web no puede funcionar sin propiedades. Preferimos que salte aquí y no
# descubrirlo el día de la restauración.
#
# Si alguna vez vaciaras el catálogo a propósito, esta comprobación hay que
# quitarla — no es un caso que valga la pena hacer configurable.
if [ "$N_PROPIEDADES" -eq 0 ]; then
  error "El respaldo no contiene NINGUNA propiedad. Eso no puede ser correcto."
  error "El archivo se subió, pero no confíes en él: revisa la base de origen."
  exit 1
fi

log "Verificado: el archivo en R2 es idéntico, se descomprime y contiene un"
log "dump completo de ${TABLAS_VERIF} tablas y ${TOTAL_FILAS} registros."

# ─── 7. Limpieza ─────────────────────────────────────────────────────────────
FASE="cierre"
rm -f "$GZ" "$VERIF_GZ" "$VERIF_SQL" "$CONTEOS"

log "BACKUP COMPLETADO: ${NOMBRE} (${TAM} bytes)"
log "  ${TABLAS_VERIF} tablas · ${TOTAL_FILAS} registros · ${N_PROPIEDADES} propiedades · ${N_VISITAS} visitas"
exit 0

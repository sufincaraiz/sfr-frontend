# Cómo restaurar la base de Su Finca Raíz

Este documento está escrito para leerse **el peor día**. No asume que sepas nada
del sistema.

**El procedimiento normal restaura a una base NUEVA.** No toca la base actual en
ningún momento. Si al final resulta que el respaldo no servía, no has perdido
nada: la base original sigue exactamente igual.

Son cuatro pasos: **descargar → descomprimir → restaurar a una base nueva →
apuntar el sitio a ella.**

> Existe una forma de restaurar *encima* de la base actual, pero borra lo que
> haya. Está al final del documento, aparte, y **casi nunca es lo que hay que
> hacer**. Si has llegado aquí con prisa, sigue los cuatro pasos de abajo y ya.

---

## Lo que necesitas

| Cosa | Dónde se consigue |
|---|---|
| Acceso a **Cloudflare → R2 → `sfr-backups`** | La cuenta de Cloudflare de Su Finca Raíz |
| Acceso a **Railway** | La cuenta del proyecto |
| **`psql` versión 18** | `winget install PostgreSQL.PostgreSQL.18`, luego abre una terminal nueva |

No hace falta contraseña de descifrado: los archivos están comprimidos, no
cifrados. Lo que los protege es que el bucket es privado.

---

# Paso 1 — Descargar el respaldo

## Lo más fácil: el panel de Cloudflare

1. Entra a **Cloudflare → R2 → `sfr-backups`**.
2. Verás archivos `sfr-backup-AAAA-MM-DD.sql.gz`, uno por semana.
3. Elige el más reciente **anterior al problema**. Si el daño lleva días sin
   detectarse, retrocede hasta antes de que empezara.
4. Clic en el archivo → **Download**.

## Por consola, si prefieres

Las credenciales están en las variables del servicio `backup` en Railway, o
puedes crear un token nuevo en Cloudflare → R2 → API Tokens.

```bash
export R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."

# Ver qué respaldos hay
curl --aws-sigv4 "aws:amz:auto:s3" \
     --user "$R2_ACCESS_KEY_ID:$R2_SECRET_ACCESS_KEY" \
     "$R2_ENDPOINT/sfr-backups?list-type=2"

# Descargar el elegido
curl --aws-sigv4 "aws:amz:auto:s3" \
     --user "$R2_ACCESS_KEY_ID:$R2_SECRET_ACCESS_KEY" \
     -o sfr-backup.sql.gz \
     "$R2_ENDPOINT/sfr-backups/sfr-backup-2026-08-09.sql.gz"
```

---

# Paso 2 — Descomprimir

**Linux / Mac / Git Bash:**

```bash
gzip -d sfr-backup.sql.gz
```

**Windows PowerShell** (sin instalar nada):

```powershell
$in  = [System.IO.File]::OpenRead("sfr-backup.sql.gz")
$out = [System.IO.File]::Create("sfr-backup.sql")
$gz  = New-Object System.IO.Compression.GZipStream($in, [System.IO.Compression.CompressionMode]::Decompress)
$gz.CopyTo($out); $gz.Dispose(); $out.Dispose(); $in.Dispose()
```

Queda `sfr-backup.sql`. Comprueba en tres segundos que está entero:

```bash
tail -n 3 sfr-backup.sql
```

Debe terminar con **`-- PostgreSQL database dump complete`**. Si no, el archivo
está cortado: usa el respaldo de la semana anterior.

---

# Paso 3 — Restaurar a una base NUEVA

**Esto no toca nada de lo que ya existe.**

1. En Railway, dentro del proyecto: **New → Database → Add PostgreSQL**.
   Tarda un minuto en crearse.
2. Abre esa base nueva → pestaña **Variables** → copia **`DATABASE_PUBLIC_URL`**
   (la pública, porque te conectas desde tu PC).
3. Restaura:

```bash
psql "postgresql://usuario:clave@host:puerto/railway" --file=sfr-backup.sql
```

Eso es todo. Verás pasar muchas líneas `CREATE TABLE`, `COPY`, `ALTER TABLE`.

**Qué es normal:** avisos sobre extensiones que ya existen.

**Qué NO es normal:** cualquier `syntax error`, o que el archivo se corte a la
mitad. Eso significa respaldo dañado — vuelve al paso 1 con el de la semana
anterior.

---

# Paso 4 — Comprobar que los datos están completos

```bash
psql "postgresql://...la-base-NUEVA..." -c "
SELECT 'properties' AS tabla, COUNT(*) FROM properties
UNION ALL SELECT 'property_types', COUNT(*) FROM property_types
UNION ALL SELECT 'admins', COUNT(*) FROM admins
UNION ALL SELECT 'leads', COUNT(*) FROM leads
UNION ALL SELECT 'articles', COUNT(*) FROM articles
UNION ALL SELECT 'visitas', COUNT(*) FROM visitas
UNION ALL SELECT 'enlaces_visitantes', COUNT(*) FROM enlaces_visitantes;"
```

**Con qué comparar:** cada ejecución del servicio deja en los logs de Railway un
inventario de lo que respaldó, así:

```
─── Contenido del respaldo ───
  tablas:            21
  registros totales: 1234
  propiedades:       32
  ...
```

Busca en Railway el log del día de ese respaldo y compara. Deben coincidir.

Como referencia adicional, el **8 de agosto de 2026** había 32 propiedades,
12 admins, 20 leads, 6 artículos y 0 visitas.

Comprueba también que el contenido no está truncado:

```bash
psql "postgresql://...la-base-NUEVA..." -c "SELECT title, LENGTH(description) FROM properties LIMIT 5;"
```

---

# Paso 5 — Poner el sitio a funcionar con la base restaurada

Cuando el paso 4 cuadre:

1. En **Vercel → Settings → Environment Variables**, cambia `DATABASE_URL` por
   la de la base nueva.
2. **Redespliega.** Las variables de Vercel solo entran en despliegues nuevos —
   cambiarla sin redesplegar no hace absolutamente nada.
3. Comprueba el sitio: entra al panel, abre una propiedad, mira `/admin/visitas`.

**La base rota sigue ahí, intacta.** No la borres todavía: puede tener datos más
recientes que el respaldo y quizá quieras rescatarlos. Déjala unos días.

---

# Después

1. **Borra el `.sql` de tu equipo.** Contiene cédulas en texto plano. No lo dejes
   en la carpeta de Descargas.
2. Actualiza `DATABASE_URL` también en el servicio `backup` de Railway, para que
   los respaldos futuros salgan de la base correcta.

---

# Si algo no cuadra

- **No hay respaldos en R2:** revisa los logs del servicio `backup` en Railway.
  Si venía fallando, debiste recibir avisos por Telegram.
- **Los archivos parecen cortados:** improbable, porque el servicio descarga y
  verifica cada copia después de subirla. Sospecha primero de tu descarga:
  bájalo otra vez.
- **Respaldo adicional:** si alguna vez corriste `scripts/backup-local.ps1`,
  mira en `backups\` dentro del proyecto. Mismo formato — ya está descargado,
  así que empieza por el paso 2.

<br>

---
---

<br>

# ⚠️ ESTO BORRA LA BASE ACTUAL

## Restaurar encima de la base de producción

> **Solo en recuperación total, y solo después de confirmar que la base viva
> está perdida.**
>
> Si la base actual todavía responde, aunque sea con datos raros, **no hagas
> esto**. Usa los pasos 1 a 5 de arriba: restauras a una base nueva y mueves el
> sitio, sin destruir nada.
>
> Lo de abajo borra todas las tablas de la base de producción y las reemplaza
> por las del respaldo. **Todo lo que haya entrado desde la fecha del respaldo
> se pierde para siempre.** No hay deshacer.

Antes de ejecutar nada, responde en voz alta:

1. ¿La base actual está realmente perdida, o solo tiene datos incorrectos?
2. ¿Probé ya el respaldo en una base nueva (pasos 3 y 4) y sé que sirve?
3. ¿Entiendo que pierdo todo lo posterior a la fecha del respaldo?

Si alguna respuesta te hace dudar, para y usa el camino seguro.

```bash
# 1. IMPRESCINDIBLE: volcado de lo que hay ahora, por roto que esté.
#    Puede tener datos recientes que el respaldo no tiene.
pg_dump "$DATABASE_URL_PRODUCCION" --no-owner --no-privileges -f antes-de-restaurar.sql

# 2. Confirma que ese archivo existe y no está vacío ANTES de seguir.
ls -lh antes-de-restaurar.sql

# 3. Vaciar y restaurar. A partir de aquí no hay vuelta atrás.
psql "$DATABASE_URL_PRODUCCION" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$DATABASE_URL_PRODUCCION" --file=sfr-backup.sql
```

Después, repite las comprobaciones del **paso 4** contra la base de producción, y
guarda `antes-de-restaurar.sql` en un sitio seguro hasta estar convencido de que
no hacía falta nada de ahí.

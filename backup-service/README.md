# Servicio de backup — Su Finca Raíz

Respalda la base de Railway a Cloudflare R2 una vez por semana.
**Es la única copia de seguridad de la base**, así que el guion está escrito para
fallar ruidosamente y para verificar cada copia después de subirla.

Para restaurar, ver **[RESTAURAR.md](RESTAURAR.md)**.

## Qué hace, en orden

1. Comprueba que estén todas las variables y que la base responda.
2. Compara la versión del servidor con la de `pg_dump` y para si el cliente es
   más viejo (ese dump fallaría o saldría incompleto).
3. `pg_dump --no-owner --no-privileges` en SQL plano.
4. Comprueba que el volcado termine con el marcador de cierre de `pg_dump`, para
   que un corte de red a media descarga no pase por bueno.
5. `gzip -9`.
6. Sube a R2 por la API S3 con firma AWS SigV4 (`curl`, sin dependencias extra).
7. **Descarga el archivo, lo descomprime y lo lee**: comprueba SHA-256 idéntico,
   gzip válido, cabecera y marcador de cierre presentes, y el mismo número de
   tablas que el original. Es lo que distingue "la subida no dio error" de "el
   respaldo sirve".
8. **Inventaría lo respaldado** y lo deja en el log: tablas, registros totales,
   y el detalle por tabla (propiedades, tipos de inmueble, leads, visitas…).
   El conteo se hace sobre el archivo descargado de R2, no sobre la base viva,
   así que el log dice qué hay *dentro del respaldo*.

Si el respaldo sale con **cero propiedades**, el script falla. La web no puede
funcionar sin catálogo, así que ese número solo puede significar un problema en
origen — mejor que salte ahí y no el día de la restauración.

## Sin cifrado propio

Por decisión explícita: la prioridad es que restaurar sea simple el día que haga
falta. La confidencialidad descansa en tres cosas, y las tres tienen que
cumplirse:

- El bucket `sfr-backups` es **privado** (sin acceso público).
- R2 **cifra en reposo** por defecto.
- Las credenciales de R2 tienen permiso **solo sobre ese bucket**.

Consecuencia a tener presente: **quien obtenga las llaves de R2 puede leer las
cédulas**. Esas credenciales son tan sensibles como la base misma. Si sospechas
que se filtraron, rota el token en Cloudflare de inmediato.

## Por qué imagen propia y no una plantilla

El servidor es **PostgreSQL 18.4**. `pg_dump` se niega a volcar desde un servidor
de versión mayor que la suya, y la mayoría de plantillas traen cliente 15, 16 o
17. Ninguna serviría. El `Dockerfile` clava `postgres:18.4-trixie`.

**Si actualizas el Postgres de Railway, sube también esa etiqueta.** El script
detecta el desajuste y falla con un mensaje explícito, pero no se arregla solo.

## Variables

| Variable | Obligatoria | Qué es |
|---|---|---|
| `DATABASE_URL` | sí | Referencia a la base de Railway |
| `R2_ENDPOINT` | sí | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | sí | `sfr-backups` |
| `R2_ACCESS_KEY_ID` | sí | Token de API de R2 |
| `R2_SECRET_ACCESS_KEY` | sí | Token de API de R2 |
| `TELEGRAM_BOT_TOKEN` | no | Para el aviso de fallo |
| `TELEGRAM_CHAT_ID` | no | Para el aviso de fallo |

El aviso de Telegram se manda **solo cuando algo falla**. Un éxito no notifica
nada; queda en los logs de Railway.

> Un aviso de error no puede detectar que el cron **no se ejecutó nunca**: un
> servicio muerto no manda mensajes. Conviene mirar el bucket una vez al mes y
> confirmar que hay un archivo nuevo por semana.

## Cron

Railway: **Settings → Cron Schedule**. Los crons de Railway corren en **UTC**,
así que domingo 4:00 a.m. hora de Colombia es `0 9 * * 0`.

## Retención

Ocho semanas, por **regla de ciclo de vida del bucket de R2**, no por este
guion. Si la rotación dependiera del script, el día que fallara a medias se
acumularían cédulas indefinidamente. La regla del bucket no se olvida.

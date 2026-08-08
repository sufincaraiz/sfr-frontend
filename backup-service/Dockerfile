# Servicio de copia de seguridad de la base de Su Finca Raíz.
#
# LA IMAGEN BASE ES LA DECISIÓN CRÍTICA. El servidor es PostgreSQL 18.4, y
# pg_dump se NIEGA a volcar desde un servidor de versión mayor que la suya. Por
# eso se clava 18.4-trixie y no "latest" ni una plantilla genérica: un cliente
# 16 o 17 fallaría en cada ejecución.
#
# Si algún día actualizas el Postgres de Railway, hay que subir esta etiqueta
# también. El script compara las versiones al arrancar y para si se separan.
FROM postgres:18.4-trixie

# curl → subida y descarga de R2 por la API S3. Trae firma AWS SigV4
#        incorporada, así que no hacen falta ni aws-cli ni rclone: una
#        dependencia menos que mantener y que se pueda romper.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates tzdata \
 && rm -rf /var/lib/apt/lists/*

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Sin privilegios de root: este contenedor solo lee la base y escribe en /tmp.
USER postgres

ENTRYPOINT ["/usr/local/bin/backup.sh"]

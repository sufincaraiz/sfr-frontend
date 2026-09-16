# PROPUESTA â€” MÃ³dulo tributario y financiero

> **ESTADO: PROPUESTA. No aplicada.** Nada de esto estÃ¡ en `prisma/schema.prisma`
> ni en la base. Este archivo existe para que la propuesta sobreviva a la sesiÃ³n.

## Principio que gobierna el mÃ³dulo

Ninguna tarifa, porcentaje ni valor tributario vive en el cÃ³digo ni en el
esquema. Todos son **parÃ¡metros por aÃ±o fiscal**, cargados desde el panel, y
nacen **vacÃ­os**: si falta el parÃ¡metro del aÃ±o, el cÃ¡lculo **se detiene y
avisa** â€” no asume cero ni el aÃ±o anterior. Es la misma regla del contenido:
lo que cambia se deriva, no se escribe.

## QuÃ© se GUARDA y quÃ© se DERIVA

La regla Â«nunca guardes un total que pueda divergir de sus componentesÂ» necesita
un matiz, porque hay dos cosas distintas:

- **Se GUARDA lo que ocurriÃ³.** El IVA que se facturÃ³ y las retenciones que la
  contraparte practicÃ³ constan en su comprobante. Son **hechos**, no cÃ¡lculos
  nuestros, y pueden diferir de lo que calculamos (redondeos, criterio del
  cliente). El sistema calcula un **sugerido** y **avisa si difiere**, pero
  guarda lo real. Si guardÃ¡ramos solo el cÃ¡lculo, la contabilidad dejarÃ­a de
  cuadrar con los soportes.
- **Se DERIVA siempre:** valor neto recibido, valor pagado, utilidad, bases
  gravables, totales por periodo. Ninguno es columna.

Por eso `valor_neto_recibido` y `valor_pagado` **no existen** en el esquema.

## Esquema propuesto

```prisma
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MÃ“DULO TRIBUTARIO Y FINANCIERO
//
// PRINCIPIO: ninguna tarifa vive en el cÃ³digo ni en el esquema. Todas son
// parÃ¡metros por AÃ‘O FISCAL, cargados desde el panel. Los campos nacen VACÃOS
// (nullable): si falta el parÃ¡metro del aÃ±o, el cÃ¡lculo se detiene y avisa.
// Es la misma regla del contenido: lo que cambia se deriva, no se escribe.
//
// QUÃ‰ SE GUARDA Y QUÃ‰ SE DERIVA:
//   Â· Se GUARDA lo que ocurriÃ³: el IVA que se facturÃ³ y las retenciones que la
//     contraparte practicÃ³ (constan en su comprobante). Eso es un HECHO, no un
//     cÃ¡lculo nuestro, y puede diferir de lo que calculamos.
//   Â· Se DERIVA siempre: valor neto, utilidad, bases gravables, totales.
//     NingÃºn total se persiste.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

enum TipoDocumento {
  CC
  NIT
  CE
  PPT
  PASAPORTE
  TI
}

enum TipoPersona {
  NATURAL
  JURIDICA
}

enum RolTercero {
  CLIENTE
  PROVEEDOR
  AMBOS
  ASESOR
}

enum EstadoIngreso {
  CAUSADO
  FACTURADO
  COBRADO
  ANULADO
}

/// Naturaleza del dinero recibido que NO es ingreso. Ver MovimientoCustodia.
enum NaturalezaCustodia {
  /// Arras o depÃ³sitos recibidos EN NOMBRE DEL VENDEDOR. Nunca son nuestros.
  DINERO_DE_TERCEROS
  /// Anticipo de honorarios propios SIN causaciÃ³n todavÃ­a (sin factura).
  ANTICIPO_PROPIO
}

enum EstadoCustodia {
  RECIBIDO
  ENTREGADO
  DEVUELTO
  APLICADO
}

enum RolParticipacion {
  PROPIA
  CORREDOR_EXTERNO
  ASESOR_INTERNO
}

/// Cliente o proveedor con identidad FISCAL. Distinto de `Contacto` (prospecto
/// del CRM): aquÃ­ el documento y las banderas del RUT son obligatorias porque
/// determinan quÃ© retenciÃ³n aplica. Se enlaza opcionalmente con el contacto del
/// que saliÃ³, para no volver a teclear los datos.
model Tercero {
  id                    String       @id @default(uuid())
  tipo_documento        TipoDocumento
  numero_documento      String
  /// DÃ­gito de verificaciÃ³n del NIT.
  dv                    String?
  /// Nombre completo o razÃ³n social.
  nombre                String
  tipo_persona          TipoPersona
  // â”€â”€ Banderas del RUT. NO se infieren: se capturan del RUT del tercero. â”€â”€
  es_responsable_iva    Boolean      @default(false)
  es_autorretenedor     Boolean      @default(false)
  es_gran_contribuyente Boolean      @default(false)
  /// Determina si se aplica la tarifa de declarante o de no declarante.
  es_declarante_renta   Boolean      @default(false)
  regimen               String?
  direccion             String?
  /// Texto libre: el domicilio fiscal puede ser cualquier municipio del paÃ­s,
  /// no solo los del GualivÃ¡ que tiene la tabla `municipalities`.
  municipio             String?
  telefono              String?
  email                 String?
  rol                   RolTercero   @default(CLIENTE)
  /// Puente OPCIONAL con el CRM. Nullable a propÃ³sito: un proveedor no es un
  /// contacto, y un contacto no necesita datos de RUT hasta que factura.
  contacto_id           String?      @unique
  contacto              Contacto?    @relation(fields: [contacto_id], references: [id], onDelete: SetNull)
  activo                Boolean      @default(true)
  notas                 String?      @db.Text
  created_at            DateTime     @default(now())
  updated_at            DateTime     @updatedAt

  ingresos              Ingreso[]
  egresos               Egreso[]
  participaciones       DistribucionComision[]
  custodiasRecibidas    MovimientoCustodia[]   @relation("CustodiaOrigen")
  custodiasEntregadas   MovimientoCustodia[]   @relation("CustodiaDestino")

  @@unique([tipo_documento, numero_documento])
  @@index([nombre])
  @@index([rol])
  @@map("terceros")
}

/// ParÃ¡metros fiscales de UN aÃ±o. Nacen VACÃOS: el contador los llena.
model ParametroFiscal {
  id             String   @id @default(uuid())
  anio           Int      @unique
  /// Valor del UVT del aÃ±o. Null = sin cargar â†’ el cÃ¡lculo se detiene.
  uvt            Decimal? @db.Decimal(14, 2)
  tarifa_iva     Decimal? @db.Decimal(5, 2)
  tarifa_reteiva Decimal? @db.Decimal(5, 2)
  /// AÃ±o cerrado: no se editan sus parÃ¡metros ni se registran movimientos.
  cerrado        Boolean  @default(false)
  notas          String?  @db.Text
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  conceptos      ConceptoRetencion[]
  tarifasIca     TarifaIca[]

  @@map("parametros_fiscales")
}

/// RetenciÃ³n por CONCEPTO y aÃ±o. Tabla, no columnas fijas: los conceptos
/// cambian y no puede exigir migraciÃ³n aÃ±adir uno.
model ConceptoRetencion {
  id                   String  @id @default(uuid())
  parametro_id         String
  parametro            ParametroFiscal @relation(fields: [parametro_id], references: [id], onDelete: Cascade)
  /// honorarios | comisiones | servicios | arrendamiento | compras | â€¦
  concepto             String
  label                String
  /// La tarifa depende de si el tercero declara renta.
  tarifa_declarante    Decimal @db.Decimal(5, 2)
  tarifa_no_declarante Decimal @db.Decimal(5, 2)
  /// Base mÃ­nima EN UVT. 0 = sin base mÃ­nima (se retiene desde el primer peso).
  base_minima_uvt      Decimal @db.Decimal(10, 2) @default(0)

  @@unique([parametro_id, concepto])
  @@map("conceptos_retencion")
}

/// Tarifa de ICA por municipio y aÃ±o (por mil). Municipio como texto: se
/// declara donde se genera el ingreso, que puede estar fuera del GualivÃ¡.
model TarifaIca {
  id             String  @id @default(uuid())
  parametro_id   String
  parametro      ParametroFiscal @relation(fields: [parametro_id], references: [id], onDelete: Cascade)
  municipio      String
  tarifa_por_mil Decimal @db.Decimal(6, 3)

  @@unique([parametro_id, municipio])
  @@map("tarifas_ica")
}

/// CatÃ¡logo de lÃ­neas de servicio. Tabla y no enum de Prisma: Â«configurableÂ»
/// y `enum` son incompatibles â€”aÃ±adir un servicio no puede exigir migraciÃ³nâ€”.
model TipoServicio {
  id                          String    @id @default(uuid())
  slug                        String    @unique
  label                       String
  /// Clave hacia ConceptoRetencion. Se guarda el CONCEPTO, nunca la tarifa.
  concepto_retencion_sugerido String?
  genera_iva                  Boolean   @default(true)
  orden                       Int       @default(0)
  activo                      Boolean   @default(true)
  ingresos                    Ingreso[]

  @@map("tipos_servicio")
}

model CategoriaEgreso {
  id                          String   @id @default(uuid())
  nombre                      String   @unique
  /// fijo | variable
  grupo                       String   @default("variable")
  es_deducible_por_defecto    Boolean  @default(true)
  genera_iva_descontable      Boolean  @default(true)
  /// Igual que en TipoServicio: el CONCEPTO de retenciÃ³n, no la tarifa.
  concepto_retencion_sugerido String?
  orden                       Int      @default(0)
  activo                      Boolean  @default(true)
  egresos                     Egreso[]

  @@map("categorias_egreso")
}

model Ingreso {
  id                    String       @id @default(uuid())
  tipo_servicio_id      String
  tipoServicio          TipoServicio @relation(fields: [tipo_servicio_id], references: [id])
  /// Las comisiones se atan a la propiedad vendida.
  property_id           String?
  property              Property?    @relation(fields: [property_id], references: [id], onDelete: SetNull)
  tercero_id            String
  tercero               Tercero      @relation(fields: [tercero_id], references: [id])
  /// CausaciÃ³n y recaudo son FECHAS DISTINTAS y ambas importan: la primera
  /// manda en renta e IVA, la segunda en el flujo de caja.
  fecha_causacion       DateTime
  fecha_recaudo         DateTime?
  valor_base            Decimal      @db.Decimal(16, 2)
  /// HECHOS del documento, no cÃ¡lculos: el IVA facturado y lo que el cliente
  /// retuvo segÃºn su comprobante. El sistema calcula un sugerido y AVISA si
  /// difiere, pero guarda lo que realmente ocurriÃ³.
  iva_generado          Decimal      @db.Decimal(16, 2) @default(0)
  retefuente_practicada Decimal      @db.Decimal(16, 2) @default(0)
  reteica_practicada    Decimal      @db.Decimal(16, 2) @default(0)
  reteiva_practicada    Decimal      @db.Decimal(16, 2) @default(0)
  // valor_neto_recibido NO existe como columna: se deriva siempre.
  numero_factura        String?
  /// CUFE de la factura electrÃ³nica emitida por el sistema DIAN que se use.
  cufe                  String?
  estado                EstadoIngreso @default(CAUSADO)
  /// Municipio donde se causa el ICA de este ingreso.
  municipio_ica         String?
  /// true = facturamos la comisiÃ³n TOTAL (las partes ajenas son egreso);
  /// false = cada corredor facturÃ³ lo suyo y aquÃ­ va solo nuestra parte.
  facturamos_total      Boolean      @default(true)
  notas                 String?      @db.Text
  /// Id del Admin que lo registrÃ³. String sin FK, igual que Contacto.created_by.
  registrado_por        String?
  created_at            DateTime     @default(now())
  updated_at            DateTime     @updatedAt

  distribuciones        DistribucionComision[]
  custodiasAplicadas    MovimientoCustodia[]

  @@index([fecha_causacion])
  @@index([fecha_recaudo])
  @@index([estado])
  @@index([property_id])
  @@index([tercero_id])
  @@map("ingresos")
}

model Egreso {
  id                       String          @id @default(uuid())
  categoria_id             String
  categoria                CategoriaEgreso @relation(fields: [categoria_id], references: [id])
  /// NULLABLE a propÃ³sito: un peaje o un tanque de gasolina se captura en tres
  /// toques y muchas veces sin tercero identificado. Se completa despuÃ©s.
  tercero_id               String?
  tercero                  Tercero?        @relation(fields: [tercero_id], references: [id], onDelete: SetNull)
  fecha                    DateTime
  descripcion              String
  valor_base               Decimal         @db.Decimal(16, 2)
  iva_descontable          Decimal         @db.Decimal(16, 2) @default(0)
  /// Las que YO le practico al proveedor (y luego declaro y pago).
  retefuente_practicada    Decimal         @db.Decimal(16, 2) @default(0)
  reteica_practicada       Decimal         @db.Decimal(16, 2) @default(0)
  reteiva_practicada       Decimal         @db.Decimal(16, 2) @default(0)
  // valor_pagado NO existe como columna: se deriva.
  /// No todo gasto real es deducible fiscalmente.
  es_deducible             Boolean         @default(true)
  property_id              String?
  property                 Property?       @relation(fields: [property_id], references: [id], onDelete: SetNull)
  soporte_url              String?
  metodo_pago              String?
  numero_factura_proveedor String?
  registrado_por           String?
  created_at               DateTime        @default(now())
  updated_at               DateTime        @updatedAt

  distribucion             DistribucionComision?

  @@index([fecha])
  @@index([categoria_id])
  @@index([property_id])
  @@index([tercero_id])
  @@map("egresos")
}

/// DINERO QUE ENTRA Y NO ES INGRESO â€” arras y anticipos.
///
/// Entidad SEPARADA, no una bandera en Ingreso, y es deliberado: con una
/// bandera, la fila sigue viviendo en `ingresos` y cada consulta, suma y
/// reporte tendrÃ­a que acordarse de excluirla. Un `WHERE` olvidado infla la
/// base gravable y produce un impuesto que no se debe. En tabla aparte, el
/// error es estructuralmente imposible.
///
/// REGLA: aquÃ­ solo entra dinero SIN causaciÃ³n. En el momento en que hay
/// causaciÃ³n (se emite factura, se presta el servicio), deja de ser custodia y
/// nace un Ingreso â€” con su IVA y sus retenciones. Por eso este modelo no
/// tiene campos de IVA: si los necesitara, ya no era custodia.
model MovimientoCustodia {
  id                     String             @id @default(uuid())
  naturaleza             NaturalezaCustodia
  /// arras, depÃ³sito de seriedad, anticipo de honorariosâ€¦
  concepto               String
  tercero_id             String
  tercero                Tercero            @relation("CustodiaOrigen", fields: [tercero_id], references: [id])
  property_id            String?
  property               Property?          @relation(fields: [property_id], references: [id], onDelete: SetNull)
  fecha_recibido         DateTime
  valor                  Decimal            @db.Decimal(16, 2)
  estado                 EstadoCustodia     @default(RECIBIDO)
  fecha_cierre           DateTime?
  /// A quiÃ©n se le entregÃ³, si era dinero de terceros.
  entregado_a_tercero_id String?
  entregadoA             Tercero?           @relation("CustodiaDestino", fields: [entregado_a_tercero_id], references: [id], onDelete: SetNull)
  /// Si terminÃ³ reconociÃ©ndose como ingreso nuestro (anticipo causado, o arras
  /// retenidas que nos corresponden), apunta al Ingreso que lo reconoce.
  ingreso_id             String?
  ingreso                Ingreso?           @relation(fields: [ingreso_id], references: [id], onDelete: SetNull)
  soporte_url            String?
  notas                  String?            @db.Text
  registrado_por         String?
  created_at             DateTime           @default(now())
  updated_at             DateTime           @updatedAt

  @@index([estado])
  @@index([property_id])
  @@index([tercero_id])
  @@map("movimientos_custodia")
}

/// COMISIÃ“N COMPARTIDA. Las filas suman SIEMPRE la comisiÃ³n total de la
/// operaciÃ³n, incluida nuestra parte (rol = PROPIA). Lo que cambia segÃºn el
/// escenario es quÃ© se factura:
///   Â· facturamos_total = true  â†’ Ingreso.valor_base es el TOTAL y cada parte
///     ajena genera un Egreso (con la retenciÃ³n que le practicamos).
///   Â· facturamos_total = false â†’ Ingreso.valor_base es SOLO nuestra parte y
///     las ajenas son informativas: no tocan la base gravable, pero sÃ­ sirven
///     para la rentabilidad real de la operaciÃ³n.
model DistribucionComision {
  id            String           @id @default(uuid())
  ingreso_id    String
  ingreso       Ingreso          @relation(fields: [ingreso_id], references: [id], onDelete: Cascade)
  /// Null cuando la fila es nuestra parte (rol = PROPIA).
  tercero_id    String?
  tercero       Tercero?         @relation(fields: [tercero_id], references: [id], onDelete: SetNull)
  rol           RolParticipacion
  porcentaje    Decimal?         @db.Decimal(5, 2)
  valor         Decimal          @db.Decimal(16, 2)
  /// Si facturamos el total, la parte ajena se paga y es egreso nuestro.
  genera_egreso Boolean          @default(false)
  egreso_id     String?          @unique
  egreso        Egreso?          @relation(fields: [egreso_id], references: [id], onDelete: SetNull)
  notas         String?

  @@index([ingreso_id])
  @@map("distribuciones_comision")
}
```

## Dry-run de la migraciÃ³n

Generado con `prisma migrate diff` entre el esquema vigente y el propuesto,
sin tocar la base:

- **DROP: 0** Â· TRUNCATE: 0 Â· RENAME: 0
- 17 objetos nuevos (10 tablas + 7 enums) e Ã­ndices.
- 16 `ALTER TABLE`, **todas `ADD CONSTRAINT FOREIGN KEY` sobre tablas nuevas**.
- **Cero `ALTER` sobre tablas existentes.** `properties` y `contactos` solo
  aparecen como *destino* de FK, lo que no les aÃ±ade ninguna columna.

Las relaciones inversas aÃ±adidas a `Property` (`ingresos`, `egresos`,
`custodias`) y a `Contacto` (`tercero`) son de nivel Prisma: **no generan SQL**.

MigraciÃ³n **aditiva pura**.

## Decisiones que se apartan del brief (y por quÃ©)

1. **`tarifa_retefuente_sugerida` en la categorÃ­a â†’ `concepto_retencion_sugerido`.**
   Guardar una *tarifa* en la categorÃ­a contradice el principio del mÃ³dulo: la
   tarifa se desactualizarÃ­a en silencio. Se guarda el **concepto**
   (Â«serviciosÂ», Â«honorariosÂ») y la tarifa se resuelve contra el parÃ¡metro del aÃ±o.
2. **`tipo_servicio` como tabla, no enum.** Â«Enum configurableÂ» es una
   contradicciÃ³n en Prisma: aÃ±adir un servicio exigirÃ­a migraciÃ³n. Tabla
   `tipos_servicio`, igual que `TipoPropiedad`.
3. **`Decimal(16,2)` para dinero**, mientras `Property.price_cop` es `BigInt`.
   Divergencia deliberada: IVA y retenciones producen centavos, y redondear en
   el esquema esconde el error. Son dominios distintos.
4. **`Egreso.tercero_id` es nullable.** Un peaje o un tanque de gasolina se
   captura en tres toques y muchas veces sin tercero identificado. Exigirlo
   matarÃ­a la captura rÃ¡pida, y un mÃ³dulo que no se alimenta muere.
5. **ICA por municipio como texto**, no FK a `municipalities`: esa tabla es del
   GualivÃ¡, y el ICA puede declararse en BogotÃ¡ u otro municipio.

## Orden de construccion (acordado)

1. Parametros fiscales - primero: sin ella no calcula nada
2. Terceros
3. Captura de egresos (tres toques + foto del soporte)
4. Captura de ingresos con distribucion de comision
5. Custodia
6. Reportes, empezando por el 1, 8 y 9

**Los reportes NO se construyen hasta que haya datos reales**: un reporte probado
con datos inventados es un reporte no probado.

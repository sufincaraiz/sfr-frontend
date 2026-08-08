import type { VisitanteVisible } from '@/lib/visitantes'

// ─────────────────────────────────────────────────────────────────────────────
// Generador de PDF del registro de visitantes, escrito a mano y sin dependencias.
//
// POR QUÉ A MANO: el proyecto no tiene librería de PDF, y las candidatas obvias
// traen problemas propios en Vercel — pdfkit necesita que el tracing de Next
// arrastre sus archivos de métricas .afm, y las que renderizan con navegador
// (puppeteer) no caben en una lambda. El documento que hace falta es una tabla
// de tres columnas con encabezado: cabe en ~200 líneas de PDF plano, usando
// Helvetica, que es una de las 14 fuentes estándar y por tanto NO hay que
// incrustar ningún archivo de fuente.
//
// El PDF se arma en el servidor y solo se sirve tras el PIN. Lleva los mismos
// tres campos que la pantalla del dueño; correo, celular y municipio no llegan
// hasta aquí porque `visitantesDe()` ni siquiera los lee de la base.
// ─────────────────────────────────────────────────────────────────────────────

const AZUL = { r: 13 / 255, g: 45 / 255, b: 94 / 255 } // #0D2D5E
const DORADO = { r: 176 / 255, g: 141 / 255, b: 63 / 255 } // #B08D3F
const GRIS = { r: 0.42, g: 0.45, b: 0.5 }
const NEGRO = { r: 0.05, g: 0.05, b: 0.08 }

const ANCHO = 595 // A4 en puntos
const ALTO = 842
const MARGEN = 50

const NOTA_CONFIDENCIAL =
  'Documento confidencial. Contiene datos personales entregados para fines de control de ' +
  'ingreso y seguridad. El destinatario se compromete a darles uso reservado conforme a la ' +
  'Ley 1581 de 2012.'

// ─── Codificación de texto ───────────────────────────────────────────────────

// WinAnsi coincide con Latin-1 en el rango donde viven las vocales acentuadas y
// la eñe, así que solo hay que traducir a mano la puntuación tipográfica, que en
// WinAnsi vive en 0x80–0x9F. Lo que no se pueda representar se degrada a "?"
// antes que romper el archivo.
const ESPECIALES: Record<string, number> = {
  '—': 0x97, // —
  '–': 0x96, // –
  '‘': 0x91, // '
  '’': 0x92, // '
  '“': 0x93, // "
  '”': 0x94, // "
  '…': 0x85, // …
  '•': 0x95, // •
}

function aWinAnsi(texto: string): Buffer {
  const bytes: number[] = []
  for (const ch of texto) {
    const esp = ESPECIALES[ch]
    if (esp !== undefined) { bytes.push(esp); continue }
    const cp = ch.codePointAt(0)!
    bytes.push(cp <= 0xff ? cp : 0x3f) // '?'
  }
  return Buffer.from(bytes)
}

/** Escapa los caracteres que delimitan una cadena literal en PDF. */
function escapar(texto: string): Buffer {
  const crudo = aWinAnsi(texto)
  const out: number[] = []
  for (const b of crudo) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out.push(0x5c) // ( ) \
    out.push(b)
  }
  return Buffer.from(out)
}

// ─── Construcción del contenido de una página ────────────────────────────────

class Lienzo {
  private partes: Buffer[] = []

  private crudo(s: string) { this.partes.push(Buffer.from(s, 'latin1')) }

  relleno(c: { r: number; g: number; b: number }) {
    this.crudo(`${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} rg\n`)
  }

  trazo(c: { r: number; g: number; b: number }) {
    this.crudo(`${c.r.toFixed(3)} ${c.g.toFixed(3)} ${c.b.toFixed(3)} RG\n`)
  }

  rect(x: number, y: number, w: number, h: number) {
    this.crudo(`${x} ${y} ${w} ${h} re f\n`)
  }

  linea(x1: number, y1: number, x2: number, y2: number, grosor = 0.7) {
    this.crudo(`${grosor} w ${x1} ${y1} m ${x2} ${y2} l S\n`)
  }

  /** `y` se mide desde abajo, como manda PDF. */
  texto(x: number, y: number, s: string, fuente: 'F1' | 'F2', tam: number) {
    this.crudo(`BT /${fuente} ${tam} Tf ${x} ${y} Td (`)
    this.partes.push(escapar(s))
    this.crudo(') Tj ET\n')
  }

  buffer(): Buffer { return Buffer.concat(this.partes) }
}

/** Parte un texto largo en renglones de ~`max` caracteres, sin cortar palabras. */
function envolver(texto: string, max: number): string[] {
  const palabras = texto.split(' ')
  const lineas: string[] = []
  let actual = ''
  for (const p of palabras) {
    if (actual && (actual + ' ' + p).length > max) { lineas.push(actual); actual = p }
    else actual = actual ? `${actual} ${p}` : p
  }
  if (actual) lineas.push(actual)
  return lineas
}

function recortar(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

const fechaLarga = (d: Date) =>
  d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })

// ─── Documento ───────────────────────────────────────────────────────────────

const COL_NOMBRE = MARGEN
const COL_CEDULA = 320
const COL_FECHA = 445
const ALTO_FILA = 19

interface DatosPdf {
  propiedad: string
  municipio: string | null
  visitantes: VisitanteVisible[]
}

function dibujarEncabezado(l: Lienzo, d: DatosPdf, generado: Date, pagina: number): number {
  // Banda corporativa
  l.relleno(AZUL)
  l.rect(0, ALTO - 78, ANCHO, 78)
  l.relleno({ r: 1, g: 1, b: 1 })
  l.texto(MARGEN, ALTO - 42, 'SU FINCA RAÍZ', 'F2', 18)
  l.relleno(DORADO)
  l.texto(MARGEN, ALTO - 60, 'LA VEGA, CUNDINAMARCA', 'F1', 8)
  l.rect(0, ALTO - 82, ANCHO, 4)

  if (pagina > 1) {
    l.relleno(GRIS)
    l.texto(MARGEN, ALTO - 105, `${d.propiedad} — continuación (página ${pagina})`, 'F1', 9)
    return ALTO - 130
  }

  l.relleno(AZUL)
  l.texto(MARGEN, ALTO - 118, recortar(`Registro de visitantes — ${d.propiedad}`, 60), 'F2', 15)

  l.relleno(GRIS)
  const sub = d.municipio ? `${d.municipio} · ` : ''
  l.texto(MARGEN, ALTO - 136, `${sub}Generado el ${fechaLarga(generado)}`, 'F1', 9)
  l.texto(MARGEN, ALTO - 150, `${d.visitantes.length} visitante${d.visitantes.length !== 1 ? 's' : ''} registrado${d.visitantes.length !== 1 ? 's' : ''}`, 'F1', 9)

  return ALTO - 180
}

function dibujarCabeceraTabla(l: Lienzo, y: number): number {
  l.relleno({ r: 0.96, g: 0.97, b: 0.98 })
  l.rect(MARGEN - 8, y - 6, ANCHO - 2 * MARGEN + 16, 22)
  l.relleno(AZUL)
  l.texto(COL_NOMBRE, y, 'NOMBRE COMPLETO', 'F2', 8.5)
  l.texto(COL_CEDULA, y, 'CÉDULA', 'F2', 8.5)
  l.texto(COL_FECHA, y, 'FECHA DE VISITA', 'F2', 8.5)
  return y - 24
}

function dibujarPie(l: Lienzo, pagina: number, total: number) {
  const lineas = envolver(NOTA_CONFIDENCIAL, 108)
  let y = 62 + (lineas.length - 1) * 10

  l.trazo(DORADO)
  l.linea(MARGEN, y + 18, ANCHO - MARGEN, y + 18, 1)

  l.relleno(GRIS)
  for (const linea of lineas) {
    l.texto(MARGEN, y, linea, 'F1', 7.5)
    y -= 10
  }

  l.relleno(GRIS)
  l.texto(ANCHO - MARGEN - 60, 28, `Página ${pagina} de ${total}`, 'F1', 7.5)
}

/** Devuelve el PDF completo como Buffer, listo para servir. */
export function generarPdfVisitantes(d: DatosPdf): Buffer {
  const generado = new Date()

  // Reparto de filas por página: la primera lleva el título completo, las demás
  // solo la banda, así que caben más.
  const paginas: VisitanteVisible[][] = []
  const yTope = (p: number) => (p === 1 ? ALTO - 180 : ALTO - 130) - 24
  const yPiso = 100

  let restantes = [...d.visitantes]
  let p = 1
  do {
    const caben = Math.max(1, Math.floor((yTope(p) - yPiso) / ALTO_FILA))
    paginas.push(restantes.slice(0, caben))
    restantes = restantes.slice(caben)
    p++
  } while (restantes.length > 0)

  const contenidos = paginas.map((filas, i) => {
    const pagina = i + 1
    const l = new Lienzo()
    let y = dibujarEncabezado(l, d, generado, pagina)
    y = dibujarCabeceraTabla(l, y)

    if (d.visitantes.length === 0) {
      l.relleno(GRIS)
      l.texto(COL_NOMBRE, y - 6, 'Todavía no hay visitas registradas para este inmueble.', 'F1', 10)
    }

    for (const v of filas) {
      l.relleno(NEGRO)
      l.texto(COL_NOMBRE, y, recortar(v.nombresCompletos, 44), 'F1', 9.5)
      l.texto(COL_CEDULA, y, v.cedula, 'F1', 9.5)
      l.texto(COL_FECHA, y, fechaCorta(v.fecha), 'F1', 9.5)
      l.trazo({ r: 0.90, g: 0.92, b: 0.94 })
      l.linea(MARGEN, y - 6, ANCHO - MARGEN, y - 6, 0.5)
      y -= ALTO_FILA
    }

    dibujarPie(l, pagina, paginas.length)
    return l.buffer()
  })

  return ensamblar(contenidos)
}

// ─── Ensamblado del archivo ──────────────────────────────────────────────────

/**
 * Arma el archivo con su tabla xref. Los objetos van numerados desde 1 y el
 * offset de cada uno se anota conforme se escribe, que es lo que exige el
 * formato para poder abrirse.
 */
function ensamblar(contenidos: Buffer[]): Buffer {
  const n = contenidos.length
  // 1 catálogo, 2 páginas, 3 y 4 fuentes, luego n páginas y n streams.
  const idPagina = (i: number) => 5 + i
  const idStream = (i: number) => 5 + n + i

  const objetos: Buffer[] = []

  objetos.push(Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1'))

  const kids = contenidos.map((_, i) => `${idPagina(i)} 0 R`).join(' ')
  objetos.push(Buffer.from(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`, 'latin1'))

  objetos.push(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', 'latin1'))
  objetos.push(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>', 'latin1'))

  contenidos.forEach((_, i) => {
    objetos.push(Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${idStream(i)} 0 R >>`,
      'latin1'
    ))
  })

  contenidos.forEach(c => {
    objetos.push(Buffer.concat([
      Buffer.from(`<< /Length ${c.length} >>\nstream\n`, 'latin1'),
      c,
      Buffer.from('\nendstream', 'latin1'),
    ]))
  })

  const cabecera = Buffer.from('%PDF-1.4\n', 'latin1')
  const partes: Buffer[] = [cabecera]
  let offset = cabecera.length
  const offsets: number[] = []

  objetos.forEach((obj, i) => {
    offsets.push(offset)
    const b = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`, 'latin1'),
      obj,
      Buffer.from('\nendobj\n', 'latin1'),
    ])
    partes.push(b)
    offset += b.length
  })

  const total = objetos.length + 1
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`
  xref += `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`

  partes.push(Buffer.from(xref, 'latin1'))
  return Buffer.concat(partes)
}

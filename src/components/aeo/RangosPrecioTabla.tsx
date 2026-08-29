import { DatosVerificables } from '@/components/aeo/DatosVerificables'
import { rangosPrecioObservados } from '@/lib/rangos-precio'

// ─────────────────────────────────────────────────────────────────────────────
// <RangosPrecioTabla> — los rangos de oferta del inventario propio.
//
// Es el bloque de datos verificables que la doctrina §3.3 pide para una página
// que aspire a ser citada, y el primero del sitio construido sobre datos
// propios. Convierte a la empresa en FUENTE PRIMARIA: los modelos citan a quien
// origina el dato, no a quien lo repite (§8).
//
// EL TAMAÑO DE MUESTRA VA EN CADA FILA, no en una nota al pie. Con 35
// propiedades repartidas en cinco tipos, ninguna celda llega a doce
// observaciones, y quien lea «fincas desde $800 millones» tiene que ver en la
// misma línea que eso sale de ocho inmuebles. Un rango sobre tres propiedades y
// uno sobre trescientas se escriben igual y no valen lo mismo.
//
// La mediana va junto al rango porque el rango solo lo fijan dos inmuebles —el
// más barato y el más caro— y en muestras así de pequeñas un solo predio atípico
// lo desplaza entero. La mediana dice dónde está de verdad el grueso.
// ─────────────────────────────────────────────────────────────────────────────

const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

interface Props {
  /** `tipo` en portada; `municipio` donde interese el corte geográfico. */
  agrupacion?: 'tipo' | 'municipio'
}

export async function RangosPrecioTabla({ agrupacion = 'tipo' }: Props) {
  const r = await rangosPrecioObservados()
  // Sin datos no se dibuja una tabla vacía: se omite el bloque entero.
  if (!r) return null

  const filas = agrupacion === 'tipo' ? r.porTipo : r.porMunicipio
  if (!filas.length) return null

  const titulo = agrupacion === 'tipo'
    ? 'Precios de oferta por tipo de inmueble — La Vega y el Gualivá, Cundinamarca'
    : 'Precios de oferta por municipio — Provincia del Gualivá, Cundinamarca'

  return (
    <DatosVerificables
      titulo={titulo}
      fechaCorte={r.corte}
      fuente={r.fuente}
      tamanoMuestra={r.total}
      metodologia={r.metodologia}
      filas={filas.map(f => ({
        etiqueta: f.clave,
        valor: f.n === 1 ? cop(f.min) : `${cop(f.min)} – ${cop(f.max)}`,
        unidad: 'COP',
        nota: f.n === 1
          // Con una sola observación no hay rango ni mediana que valga: se dice
          // que es un caso único y no se disfraza de estadística.
          ? 'Una sola propiedad publicada: es un precio concreto, no un rango de mercado.'
          : `Mediana ${cop(f.mediana)} · ${f.n} propiedades publicadas`,
      }))}
    >
      {/* El aviso automático del componente salta por debajo de diez
          observaciones TOTALES, y aquí el total son 35. Pero las celdas no: casi
          ninguna llega a doce. El aviso que importa es este, y va explícito. */}
      <span style={{ display: 'block', marginTop: 6, color: '#B45309', fontWeight: 600 }}>
        Ninguna fila supera las {Math.max(...filas.map(f => f.n))} observaciones. Son rangos de
        lo publicado hoy, no una serie histórica ni un estudio de mercado del municipio.
      </span>
    </DatosVerificables>
  )
}

/**
 * Los rangos de UN municipio, y solo si ese municipio tiene muestra para un
 * rango. Si no la tiene, no dibuja nada: la página ya dice qué hay publicado
 * hoy en su listado y en su respuesta directa, que es lo cierto, sin
 * presentarlo como referencia de mercado.
 */
export async function RangosMunicipio({ municipio }: { municipio: string }) {
  const r = await rangosPrecioObservados()
  if (!r) return null

  const fila = r.porMunicipio.find(m => m.clave === municipio)
  if (!fila) return null

  return (
    <DatosVerificables
      titulo={`Precios de oferta en ${municipio}, Cundinamarca`}
      fechaCorte={r.corte}
      fuente={r.fuente}
      tamanoMuestra={fila.n}
      metodologia={r.metodologia}
      filas={[
        { etiqueta: 'Rango publicado', valor: `${cop(fila.min)} – ${cop(fila.max)}`, unidad: 'COP' },
        { etiqueta: 'Mediana',         valor: cop(fila.mediana), unidad: 'COP' },
        { etiqueta: 'Propiedades en la muestra', valor: fila.n },
      ]}
    >
      {/* Límite declarado: la variante por municipio también lo lleva, no solo la
          tabla general. Un rango sin este marco se lee como referencia de mercado. */}
      <span style={{ display: 'block', marginTop: 6, color: '#B45309', fontWeight: 600 }}>
        Rango de lo publicado hoy en {municipio}, no una tasación ni un estudio de mercado.
        Con muestras pequeñas el rango es orientativo.
      </span>
    </DatosVerificables>
  )
}

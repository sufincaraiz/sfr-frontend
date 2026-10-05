'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, TrendingDown, TrendingUp } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// LOS TRES REPORTES QUE NO DEPENDEN DE TARIFAS
//   · Resultado del periodo: ingresos menos gastos.
//   · Ingresos por línea de servicio — qué sostiene el negocio.
//   · Gastos por categoría.
//
// Los de retenciones, IVA e ICA no están: con el año fiscal en borrador solo
// podrían mostrar ceros, y un cero que parece un dato es peor que una pantalla
// que dice qué falta.
// ─────────────────────────────────────────────────────────────────────────────

const C = { navy: '#0D2D5E', blue: '#1B56A1', line: '#E2E8F0', muted: '#64748B', ok: '#15803D', warn: '#B45309', bad: '#B91C1C' };

interface Linea { id: string; linea: string; total: string; cantidad: number; cobrado: string; porcentaje: number }
interface Categoria { id: string; categoria: string; total: string; cantidad: number; no_deducible: string; porcentaje: number }
interface Reporte {
  anio: number; mes: number; desde: string; hasta: string;
  ingresos: string; gastos: string; resultado: string; margen: number;
  lineas: Linea[]; categorias: Categoria[];
  movimientos: { ingresos: number; gastos: number };
}

const dinero = (v: string) => `$ ${Number(v).toLocaleString('es-CO')}`;
const MESES = ['Todo el año', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function ReportesPage() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(0);
  const [r, setR] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [bloqueo, setBloqueo] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true); setBloqueo('');
    const res = await fetch(`/api/admin/finanzas/reportes?anio=${anio}&mes=${mes}`);
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    const j = await res.json();
    if (!res.ok) {
      // Una guarda detuvo el reporte. No se muestra un reporte a medias.
      setBloqueo(j.error ?? 'No se pudo calcular.');
      setR(null);
    } else setR(j);
    setCargando(false);
  }, [anio, mes]);

  useEffect(() => { cargar(); }, [cargar]);

  const selS: React.CSSProperties = { padding: '8px 11px', border: `1.5px solid ${C.line}`, borderRadius: 9, fontSize: '0.88rem', color: C.navy, background: '#fff', fontWeight: 700, fontFamily: 'inherit' };
  const tarjeta: React.CSSProperties = { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '1.1rem 1.25rem' };

  return (
    <div style={{ maxWidth: 900, paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={selS}>
          {[hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={mes} onChange={e => setMes(Number(e.target.value))} style={selS}>
          {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        {r && <span style={{ color: C.muted, fontSize: '0.8rem' }}>{r.desde} a {r.hasta}</span>}
      </div>

      {bloqueo && (
        <div role="alert" style={{ background: '#FEF2F2', border: '2px solid #FCA5A5', color: '#7F1D1D', borderRadius: 14, padding: '1rem 1.25rem', fontSize: '0.86rem', lineHeight: 1.5 }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <AlertTriangle size={18} /> El reporte NO se emite
          </strong>
          {bloqueo}
        </div>
      )}

      {cargando && <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <Loader2 size={24} style={{ color: C.navy, animation: 'girar 1s linear infinite' }} />
        <style>{'@keyframes girar{to{transform:rotate(360deg)}}'}</style>
      </div>}

      {r && !cargando && (
        <>
          <div style={{ ...tarjeta, display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ color: C.muted, fontSize: '0.8rem' }}>Ingresos</div>
              <div style={{ color: C.navy, fontWeight: 800, fontSize: '1.6rem' }}>{dinero(r.ingresos)}</div>
              <div style={{ color: C.muted, fontSize: '0.76rem' }}>{r.movimientos.ingresos} movimiento{r.movimientos.ingresos === 1 ? '' : 's'}</div>
            </div>
            <div style={{ borderLeft: `1px solid ${C.line}`, paddingLeft: '2rem' }}>
              <div style={{ color: C.muted, fontSize: '0.8rem' }}>Gastos</div>
              <div style={{ color: C.navy, fontWeight: 800, fontSize: '1.6rem' }}>{dinero(r.gastos)}</div>
              <div style={{ color: C.muted, fontSize: '0.76rem' }}>{r.movimientos.gastos} movimiento{r.movimientos.gastos === 1 ? '' : 's'}</div>
            </div>
            <div style={{ borderLeft: `1px solid ${C.line}`, paddingLeft: '2rem' }}>
              <div style={{ color: C.muted, fontSize: '0.8rem' }}>Resultado</div>
              <div style={{ color: Number(r.resultado) < 0 ? C.bad : C.ok, fontWeight: 800, fontSize: '1.6rem' }}>{dinero(r.resultado)}</div>
              <div style={{ color: C.muted, fontSize: '0.76rem' }}>
                {Number(r.ingresos) > 0 ? `margen ${r.margen} %` : 'sin ingresos en el periodo'} · antes de impuestos
              </div>
            </div>
          </div>

          <Bloque
            titulo="Ingresos por línea de servicio"
            subtitulo="Qué sostiene el negocio."
            icono={<TrendingUp size={17} style={{ color: C.ok }} />}
            vacio="No hay ingresos registrados en el periodo."
            filas={r.lineas.map(l => ({
              id: l.id, nombre: l.linea, total: l.total, porcentaje: l.porcentaje,
              detalle: `${l.cantidad} movimiento${l.cantidad === 1 ? '' : 's'}` +
                (Number(l.cobrado) < Number(l.total) ? ` · cobrado ${dinero(l.cobrado)}` : ' · todo cobrado'),
              color: C.ok,
            }))}
          />

          <Bloque
            titulo="Gastos por categoría"
            subtitulo="Los reembolsables no están: son cuentas por cobrar, no gasto."
            icono={<TrendingDown size={17} style={{ color: C.warn }} />}
            vacio="No hay gastos registrados en el periodo."
            filas={r.categorias.map(c => ({
              id: c.id, nombre: c.categoria, total: c.total, porcentaje: c.porcentaje,
              detalle: `${c.cantidad} movimiento${c.cantidad === 1 ? '' : 's'}` +
                (Number(c.no_deducible) > 0 ? ` · ${dinero(c.no_deducible)} no deducible` : ''),
              color: C.warn,
            }))}
          />

          <p style={{ color: C.muted, fontSize: '0.8rem', marginTop: '1.5rem', lineHeight: 1.5 }}>
            Los reportes de retenciones, IVA e ICA esperan los parámetros del año: con el año en borrador
            solo mostrarían ceros.
          </p>
        </>
      )}
    </div>
  );
}

function Bloque({ titulo, subtitulo, icono, filas, vacio }: {
  titulo: string; subtitulo: string; icono: React.ReactNode; vacio: string;
  filas: { id: string; nombre: string; total: string; porcentaje: number; detalle: string; color: string }[];
}) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '1.1rem 1.25rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.navy, fontWeight: 800 }}>{icono} {titulo}</div>
      <p style={{ color: C.muted, fontSize: '0.8rem', margin: '2px 0 12px' }}>{subtitulo}</p>
      {filas.length === 0 ? (
        <p style={{ color: C.muted, fontSize: '0.85rem', margin: 0 }}>{vacio}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filas.map(f => (
            <div key={f.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: '0.88rem' }}>
                <span style={{ color: C.navy, fontWeight: 700 }}>{f.nombre}</span>
                <span style={{ color: C.navy, fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {`$ ${Number(f.total).toLocaleString('es-CO')}`}
                  <span style={{ color: C.muted, fontWeight: 400, fontSize: '0.78rem' }}> · {f.porcentaje} %</span>
                </span>
              </div>
              {/* La barra es la comparación: con cifras sueltas no se ve cuál
                  pesa, que es justo lo que este reporte tiene que responder. */}
              <div style={{ height: 7, background: '#F1F5F9', borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(f.porcentaje, 1)}%`, height: '100%', background: f.color, borderRadius: 999 }} />
              </div>
              <div style={{ color: C.muted, fontSize: '0.76rem', marginTop: 3 }}>{f.detalle}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

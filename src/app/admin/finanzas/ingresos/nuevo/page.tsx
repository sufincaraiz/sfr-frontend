'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowLeft, Check, Handshake, Loader2, Plus, Search, Trash2, X,
} from 'lucide-react';
import {
  consecuenciaDelReparto, erroresDeIngreso, erroresDeReparto, faltantesDeIngreso,
  type IngresoCapturado, type ParteComision,
} from '@/lib/finanzas/captura-ingreso';

// ─────────────────────────────────────────────────────────────────────────────
// CAPTURA DE UN INGRESO — mismo principio que el gasto: pocos toques.
//   1. Valor   2. Tipo de servicio   3. Propiedad o cliente   4. Guardar
//
// Retenciones, factura, fecha de recaudo y CIIU se completan en el escritorio;
// el ingreso nace POR COMPLETAR y ya cuenta en los reportes.
//
// Dos cosas que la pantalla NO deja hacer, porque tienen consecuencia fiscal:
//   · Cargar IVA si el año no es responsable (o si está sin decidir).
//   · Repartir una comisión que no sume el total.
// ─────────────────────────────────────────────────────────────────────────────

const C = { navy: '#0D2D5E', blue: '#1B56A1', line: '#E2E8F0', muted: '#64748B', ok: '#15803D', warn: '#B45309', warnBg: '#FFFBEB', bad: '#B91C1C', badBg: '#FEF2F2' };

interface Tipo { id: string; nombre: string; orden: number; slug: string; ciiu: string | null; es_comision: boolean; concepto_retencion_sugerido: string | null }
interface Destino { id: string; etiqueta: string; detalle: string }
interface EstadoAnio { anio: number; activo: boolean; responsable_iva: boolean | null }

const pesos = (v: string) => {
  const n = v.replace(/\D/g, '');
  return n === '' ? '' : Number(n).toLocaleString('es-CO');
};
const crudo = (v: string) => v.replace(/\./g, '');

export default function NuevoIngresoPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [valor, setValor] = useState('');
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [anio, setAnio] = useState<EstadoAnio | null>(null);
  const [propiedad, setPropiedad] = useState<Destino | null>(null);
  const [cliente, setCliente] = useState<Destino | null>(null);
  const [partes, setPartes] = useState<ParteComision[]>([]);
  const [facturamosTotal, setFacturamosTotal] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [hecho, setHecho] = useState<{ valor: string; tipo: string; faltan: string[]; consecuencia: string | null; nota: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/admin/finanzas/ingresos?vista=captura')
      .then(r => { if (r.status === 401) { window.location.href = '/admin/login'; return null; } return r.json(); })
      .then(d => { if (d) { setTipos(d.tipos ?? []); setAnio(d.anio ?? null); } })
      .catch(() => setError('No se pudieron cargar los tipos de servicio.'));
  }, []);

  const esComision = !!tipo?.es_comision;

  const cuerpo = (): IngresoCapturado => ({
    valor: crudo(valor),
    tipo_servicio_id: tipo?.id ?? '',
    property_id: esComision ? propiedad?.id ?? null : null,
    tercero_id: cliente?.id ?? null,
    facturamos_total: facturamosTotal,
    partes: partes.length ? partes : undefined,
  });

  async function guardar() {
    const datos = cuerpo();
    const errores = erroresDeIngreso(datos, { esComision, responsableIva: anio?.responsable_iva ?? null });
    if (errores.length) { setError(errores.join(' ')); return; }
    setGuardando(true); setError('');
    try {
      const res = await fetch('/api/admin/finanzas/ingresos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? 'No se pudo guardar.'); setGuardando(false); return; }
      setHecho({ valor: pesos(valor), tipo: tipo!.nombre, faltan: j.faltan ?? [], consecuencia: j.consecuencia ?? null, nota: j.nota ?? null });
    } catch {
      // A diferencia del gasto, el ingreso NO se encola: un ingreso sin
      // factura ni cliente confirmado no se registra a ciegas desde la calle.
      setError('Sin conexión. El ingreso no se guardó: vuelve a intentarlo cuando tengas señal.');
    }
    setGuardando(false);
  }

  function otro() {
    setPaso(1); setValor(''); setTipo(null); setPropiedad(null); setCliente(null);
    setPartes([]); setFacturamosTotal(true); setHecho(null); setError('');
  }

  const btnGrande: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '16px 18px',
    border: `1.5px solid ${C.line}`, borderRadius: 14, background: '#fff', cursor: 'pointer',
    fontSize: '1rem', fontWeight: 700, color: C.navy, textAlign: 'left',
  };

  if (hecho) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '2rem 0', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: '#F0FDF4', display: 'grid', placeItems: 'center', margin: '0 auto 1rem' }}>
          <Check size={32} style={{ color: C.ok }} />
        </div>
        <h2 style={{ color: C.navy, margin: '0 0 6px' }}>${hecho.valor}</h2>
        <p style={{ color: C.muted, margin: '0 0 1rem' }}>{hecho.tipo}</p>
        {hecho.consecuencia && (
          <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E3A8A', borderRadius: 12, padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
            {hecho.consecuencia}
          </div>
        )}
        {hecho.nota && (
          <div style={{ background: C.warnBg, border: '1.5px solid #FDE68A', color: '#78350F', borderRadius: 12, padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.82rem', marginBottom: '0.8rem' }}>
            {hecho.nota}
          </div>
        )}
        {hecho.faltan.length > 0 && (
          <p style={{ color: C.warn, fontWeight: 700, fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
            Falta completar en el escritorio: {hecho.faltan.join(' · ')}.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={otro} style={{ ...btnGrande, justifyContent: 'center', background: C.navy, color: '#fff', border: 'none' }}>Otro ingreso</button>
          <button onClick={() => router.push('/admin/finanzas')} style={{ ...btnGrande, justifyContent: 'center' }}>Volver a finanzas</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <button onClick={() => (paso === 1 ? router.push('/admin/finanzas') : setPaso(paso - 1))}
          aria-label="Atrás" style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.navy, padding: 6 }}>
          <ArrowLeft size={22} />
        </button>
        <strong style={{ color: C.navy, fontSize: '1.05rem' }}>Nuevo ingreso</strong>
        <span style={{ marginLeft: 'auto', color: C.muted, fontSize: '0.8rem' }}>Paso {paso} de 4</span>
      </div>

      {anio && !anio.activo && (
        <div style={{ background: C.warnBg, border: '1.5px solid #FDE68A', color: '#78350F', borderRadius: 12, padding: '0.7rem 0.9rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
          Los parámetros de {anio.anio} no están activos. El ingreso se registra igual —y cuenta en los reportes—,
          pero sin retención sugerida con la que contrastar lo que te retuvieron.
        </div>
      )}
      {error && <div style={{ background: C.badBg, border: '1.5px solid #FECACA', color: C.bad, borderRadius: 12, padding: '0.7rem 0.9rem', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>}

      {paso === 1 && (
        <div>
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <input value={valor ? `$ ${valor}` : ''} onChange={e => setValor(pesos(e.target.value))}
              inputMode="numeric" autoFocus placeholder="$ 0" aria-label="Valor del ingreso"
              style={{ width: '100%', border: 'none', borderBottom: `2px solid ${C.line}`, fontSize: '2.6rem', fontWeight: 800, textAlign: 'center', color: C.navy, outline: 'none', fontFamily: 'inherit', background: 'transparent' }} />
            <p style={{ color: C.muted, fontSize: '0.8rem', marginTop: 10 }}>
              El valor de la comisión o del servicio, antes de retenciones.
            </p>
          </div>
          <button onClick={() => setPaso(2)} disabled={!valor}
            style={{ ...btnGrande, justifyContent: 'center', background: C.navy, color: '#fff', border: 'none', opacity: valor ? 1 : 0.4 }}>
            Siguiente
          </button>
        </div>
      )}

      {paso === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tipos.map(t => (
            <button key={t.id} onClick={() => { setTipo(t); setPaso(3); }}
              style={{ ...btnGrande, borderColor: tipo?.id === t.id ? C.navy : C.line, flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span>{t.nombre}</span>
              {/* CÓDIGO DE COLOR, a propósito: ámbar y rojo son para lo que
                  pide acción NUESTRA. Esto espera a un tercero —el contador—,
                  así que va en gris: hoy lo llevan los cinco tipos y en ámbar
                  alarmaría en cada registro sin que haya nada que hacer. */}
              <span style={{ fontWeight: 400, fontSize: '0.8rem', color: C.muted }}>
                {t.ciiu
                  ? `CIIU ${t.ciiu}`
                  : 'CIIU pendiente del contador · no impide registrar; el ICA se calcula cuando llegue'}
              </span>
            </button>
          ))}
          {tipos.length === 0 && <p style={{ color: C.muted }}>No hay tipos de servicio configurados.</p>}
        </div>
      )}

      {paso === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {esComision && (
            <div>
              <strong style={{ color: C.navy, fontSize: '0.9rem' }}>Propiedad vendida</strong>
              <p style={{ color: C.muted, fontSize: '0.8rem', margin: '2px 0 8px' }}>
                De aquí sale el municipio del ICA.
              </p>
              <Selector tipo="propiedad" elegido={propiedad} onElegir={setPropiedad} />
            </div>
          )}
          <div>
            <strong style={{ color: C.navy, fontSize: '0.9rem' }}>¿Quién paga?</strong>
            <p style={{ color: C.muted, fontSize: '0.8rem', margin: '2px 0 8px' }}>
              El cliente a quien se le factura. Si no existe, se crea con el nombre.
            </p>
            <Selector tipo="cliente" elegido={cliente} onElegir={setCliente} />
          </div>
          <button onClick={() => setPaso(4)}
            disabled={!cliente || (esComision && !propiedad)}
            style={{ ...btnGrande, justifyContent: 'center', background: C.navy, color: '#fff', border: 'none', opacity: cliente && (!esComision || propiedad) ? 1 : 0.4 }}>
            {esComision ? 'Siguiente: reparto' : 'Revisar y guardar'}
          </button>
        </div>
      )}

      {paso === 4 && (
        <Reparto
          esComision={esComision}
          valor={valor}
          partes={partes}
          setPartes={setPartes}
          facturamosTotal={facturamosTotal}
          setFacturamosTotal={setFacturamosTotal}
          guardando={guardando}
          onGuardar={guardar}
          btnGrande={btnGrande}
        />
      )}
    </div>
  );
}

/**
 * Reparto de la comisión. Vive DENTRO de la captura y no en una pantalla
 * aparte, porque la consecuencia fiscal depende de `facturamos_total` y hay que
 * decidirla al registrar, no después.
 */
function Reparto({
  esComision, valor, partes, setPartes, facturamosTotal, setFacturamosTotal, guardando, onGuardar, btnGrande,
}: {
  esComision: boolean; valor: string; partes: ParteComision[];
  setPartes: (p: ParteComision[]) => void;
  facturamosTotal: boolean; setFacturamosTotal: (v: boolean) => void;
  guardando: boolean; onGuardar: () => void; btnGrande: React.CSSProperties;
}) {
  const [eligiendo, setEligiendo] = useState(false);
  const total = Number(crudo(valor) || 0);
  const suma = partes.reduce((s, p) => s + Number(crudo(p.valor) || 0), 0);
  const errores = partes.length ? erroresDeReparto(crudo(valor), partes) : [];
  const consecuencia = partes.length ? consecuenciaDelReparto(crudo(valor), partes, facturamosTotal) : null;
  const faltanDespues = faltantesDeIngreso({ valor: crudo(valor), tipo_servicio_id: 'x' });

  const inputS: React.CSSProperties = { padding: '9px 11px', border: `1.5px solid ${C.line}`, borderRadius: 9, fontSize: '0.9rem', color: C.navy, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {esComision && (
        <>
          <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '1rem' }}>
            <strong style={{ color: C.navy, fontSize: '0.92rem' }}>¿Se comparte la comisión?</strong>
            <p style={{ color: C.muted, fontSize: '0.8rem', margin: '4px 0 10px' }}>
              Si es toda nuestra, no hace falta repartir. Si se comparte, las filas tienen que sumar
              la comisión total <strong>incluida nuestra parte</strong>.
            </p>

            {partes.length === 0 ? (
              <button type="button" onClick={() => setPartes([
                { rol: 'PROPIA', valor: pesos(String(Math.round(total / 2))) },
                { rol: 'CORREDOR_EXTERNO', valor: pesos(String(total - Math.round(total / 2))), tercero_id: null },
              ])} style={{ ...btnGrande, borderStyle: 'dashed', justifyContent: 'center' }}>
                <Handshake size={18} /> Repartir la comisión
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {partes.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: p.rol === 'PROPIA' ? C.navy : C.muted }}>
                        {p.rol === 'PROPIA' ? 'Nuestra parte' : p.etiqueta ?? 'Corredor externo — elige quién'}
                      </div>
                      {p.rol !== 'PROPIA' && !p.tercero_id && (
                        <button type="button" onClick={() => setEligiendo(true)}
                          style={{ border: `1px solid ${C.warn}`, color: C.warn, background: '#fff', borderRadius: 7, padding: '2px 8px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', marginTop: 2 }}>
                          Elegir corredor
                        </button>
                      )}
                    </div>
                    <input value={p.valor} onChange={e => setPartes(partes.map((x, n) => n === i ? { ...x, valor: pesos(e.target.value) } : x))}
                      inputMode="numeric" style={{ ...inputS, width: 130, textAlign: 'right' }} aria-label={`Valor de la parte ${i + 1}`} />
                    {p.rol !== 'PROPIA' && (
                      <button type="button" aria-label="Quitar parte" onClick={() => setPartes(partes.filter((_, n) => n !== i))}
                        style={{ border: 'none', background: 'none', color: C.bad, cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setPartes([...partes, { rol: 'CORREDOR_EXTERNO', valor: '', tercero_id: null }])}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1.5px dashed ${C.line}`, background: '#fff', color: C.blue, fontWeight: 800, borderRadius: 9, padding: '7px 12px', cursor: 'pointer', fontSize: '0.82rem', alignSelf: 'flex-start' }}>
                  <Plus size={14} /> Otra parte
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', borderTop: `1px solid ${C.line}`, paddingTop: 8, marginTop: 4 }}>
                  <span style={{ color: C.muted }}>Suman</span>
                  <strong style={{ color: Math.abs(suma - total) <= 1 ? C.ok : C.bad }}>
                    ${suma.toLocaleString('es-CO')} de ${total.toLocaleString('es-CO')}
                  </strong>
                </div>
                <button type="button" onClick={() => setPartes([])}
                  style={{ border: 'none', background: 'none', color: C.muted, fontSize: '0.78rem', cursor: 'pointer', alignSelf: 'flex-start' }}>
                  <X size={12} /> No repartir: la comisión es toda nuestra
                </button>
              </div>
            )}

            {eligiendo && (
              <div style={{ marginTop: 10 }}>
                <Selector tipo="cliente" elegido={null} onElegir={d => {
                  if (!d) { setEligiendo(false); return; }
                  const i = partes.findIndex(p => p.rol !== 'PROPIA' && !p.tercero_id);
                  if (i >= 0) setPartes(partes.map((x, n) => n === i ? { ...x, tercero_id: d.id, etiqueta: d.etiqueta } : x));
                  setEligiendo(false);
                }} />
              </div>
            )}
          </div>

          {partes.length > 0 && (
            <div style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '1rem' }}>
              <strong style={{ color: C.navy, fontSize: '0.92rem' }}>¿Quién factura?</strong>
              <p style={{ color: C.muted, fontSize: '0.8rem', margin: '4px 0 10px' }}>
                Esto cambia lo que se declara, no solo el registro.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { v: true, t: 'Facturamos el total', d: 'La base gravable es la comisión completa, y cada parte ajena se registra como gasto nuestro.' },
                  { v: false, t: 'Cada uno factura lo suyo', d: 'La base gravable es solo nuestra parte; las ajenas quedan de referencia.' },
                ].map(o => (
                  <button key={String(o.v)} type="button" onClick={() => setFacturamosTotal(o.v)}
                    style={{ ...btnGrande, borderColor: facturamosTotal === o.v ? C.navy : C.line, flexDirection: 'column', alignItems: 'flex-start', gap: 2, background: facturamosTotal === o.v ? '#F8FAFC' : '#fff' }}>
                    <span>{o.t}</span>
                    <span style={{ fontWeight: 400, fontSize: '0.8rem', color: C.muted }}>{o.d}</span>
                  </button>
                ))}
              </div>
              {consecuencia && (
                <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E3A8A', borderRadius: 10, padding: '0.7rem 0.9rem', fontSize: '0.83rem', marginTop: 10, fontWeight: 600 }}>
                  {consecuencia.explicacion}
                </div>
              )}
            </div>
          )}

          {errores.length > 0 && (
            <div style={{ background: C.badBg, border: '1.5px solid #FECACA', color: C.bad, borderRadius: 12, padding: '0.7rem 0.9rem', fontSize: '0.84rem' }}>
              <AlertTriangle size={14} style={{ verticalAlign: -2 }} /> {errores.join(' ')}
            </div>
          )}
        </>
      )}

      <div style={{ background: '#F8FAFC', border: `1px solid ${C.line}`, borderRadius: 12, padding: '0.8rem 1rem', fontSize: '0.82rem', color: C.muted }}>
        Se completa después en el escritorio: {faltanDespues.join(' · ')}.
      </div>

      <button onClick={onGuardar} disabled={guardando || errores.length > 0}
        style={{ ...btnGrande, justifyContent: 'center', background: C.navy, color: '#fff', border: 'none' }}>
        {guardando ? <Loader2 size={18} className="girar" /> : <Check size={18} />} Guardar
      </button>
      <style>{'.girar{animation:girar 1s linear infinite}@keyframes girar{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

/** Buscador con los recientes arriba. Reutiliza el endpoint de destinos. */
function Selector({ tipo, elegido, onElegir }: { tipo: 'propiedad' | 'cliente'; elegido: Destino | null; onElegir: (d: Destino | null) => void }) {
  const [q, setQ] = useState('');
  const [lista, setLista] = useState<Destino[]>([]);
  const [cargando, setCargando] = useState(false);
  const [creando, setCreando] = useState(false);

  const buscar = useCallback(async (texto: string) => {
    setCargando(true);
    try {
      const r = await fetch(`/api/admin/finanzas/destinos?q=${encodeURIComponent(texto)}`);
      const d = await r.json();
      setLista(tipo === 'propiedad' ? d.propiedades ?? [] : d.terceros ?? []);
    } catch { /* la lista queda como esté */ }
    setCargando(false);
  }, [tipo]);

  useEffect(() => { buscar(''); }, [buscar]);
  useEffect(() => { const t = setTimeout(() => buscar(q), 250); return () => clearTimeout(t); }, [q, buscar]);

  async function crear() {
    setCreando(true);
    try {
      const r = await fetch('/api/admin/finanzas/destinos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: q, rol: 'CLIENTE' }),
      });
      if (r.ok) onElegir(await r.json());
    } finally { setCreando(false); }
  }

  if (elegido) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${C.navy}`, borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.navy, fontWeight: 700, fontSize: '0.9rem' }}>{elegido.etiqueta}</div>
          {elegido.detalle && <div style={{ color: C.muted, fontSize: '0.78rem' }}>{elegido.detalle}</div>}
        </div>
        <button type="button" onClick={() => onElegir(null)} aria-label="Cambiar"
          style={{ border: 'none', background: 'none', color: C.muted, cursor: 'pointer' }}><X size={16} /></button>
      </div>
    );
  }

  return (
    <div style={{ border: `1.5px solid ${C.line}`, borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${C.line}`, borderRadius: 10, padding: '8px 10px' }}>
        <Search size={16} style={{ color: C.muted }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={tipo === 'propiedad' ? 'Buscar propiedad…' : 'Buscar cliente…'}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: C.navy, fontFamily: 'inherit' }} />
        {cargando && <Loader2 size={15} className="girar" style={{ color: C.muted }} />}
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lista.map(d => (
          <button key={d.id} type="button" onClick={() => onElegir(d)}
            style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.line}`, background: '#fff', cursor: 'pointer', color: C.navy, fontWeight: 600, fontSize: '0.88rem' }}>
            {d.etiqueta}
            {d.detalle && <span style={{ display: 'block', fontWeight: 400, fontSize: '0.76rem', color: C.muted }}>{d.detalle}</span>}
          </button>
        ))}
        {!cargando && lista.length === 0 && <p style={{ color: C.muted, fontSize: '0.84rem', margin: 4 }}>Sin resultados.</p>}
      </div>
      {tipo === 'cliente' && q.trim().length >= 3 && (
        <button type="button" onClick={crear} disabled={creando}
          style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px dashed ${C.blue}`, background: '#fff', color: C.blue, fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}>
          {creando ? 'Creando…' : `Crear cliente «${q.trim()}» (datos del RUT después)`}
        </button>
      )}
    </div>
  );
}

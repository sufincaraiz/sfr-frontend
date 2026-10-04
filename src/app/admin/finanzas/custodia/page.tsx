'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownToLine, ArrowUpFromLine, Check, Landmark, Loader2, Plus, Search, Undo2, X,
} from 'lucide-react';
import {
  NATURALEZAS_CUSTODIA, erroresDeCustodia,
  type CustodiaCapturada, type NaturalezaCustodia,
} from '@/lib/finanzas/captura-custodia';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTODIA DE DINEROS DE TERCEROS — plata en nuestras manos que NO es ingreso.
//
// Dos naturalezas con salidas opuestas, y por eso nunca se muestran sumadas:
//   · Arras del vendedor  → se entregan o se devuelven. Jamás son ingreso.
//   · Anticipo propio     → se CAUSA, y ahí nace el Ingreso que lo declara.
//
// Los colores siguen el criterio del módulo (rojo: hay que mirarlo; ámbar:
// falta algo nuestro; gris: esperamos), con el escalamiento por TIEMPO que
// calcula el servidor: aquí no hay nada que recordar revisar.
// ─────────────────────────────────────────────────────────────────────────────

const C = { navy: '#0D2D5E', blue: '#1B56A1', line: '#E2E8F0', muted: '#64748B', ok: '#15803D', warn: '#B45309', warnBg: '#FFFBEB', bad: '#B91C1C', badBg: '#FEF2F2' };

interface Movimiento {
  id: string; naturaleza: NaturalezaCustodia; concepto: string; valor: string; estado: string;
  fecha: string; fecha_cierre: string | null; dias: number | null;
  color: 'gris' | 'ambar' | 'rojo'; motivo: string | null;
  de: string; entregado_a: string | null; propiedad: string | null; ingreso_id: string | null; notas: string | null;
}
interface Resumen {
  ajeno: { total: string; cantidad: number; color: string; masViejoDias: number };
  propio: { total: string; cantidad: number; color: string; masViejoDias: number };
  enLaCuenta: string;
}
interface Tipo { id: string; nombre: string }
interface Destino { id: string; etiqueta: string; detalle: string }

const dinero = (v: string) => `$ ${Number(v).toLocaleString('es-CO')}`;
const dia = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' });
const pesos = (v: string) => { const n = v.replace(/\D/g, ''); return n === '' ? '' : Number(n).toLocaleString('es-CO'); };
const tono = (c: string) => c === 'rojo' ? { bg: C.badBg, fg: C.bad } : c === 'ambar' ? { bg: C.warnBg, fg: C.warn } : { bg: '#F1F5F9', fg: C.muted };

export default function CustodiaPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    const r = await fetch('/api/admin/finanzas/custodia');
    if (r.status === 401) { window.location.href = '/admin/login'; return; }
    const d = await r.json();
    setMovimientos(d.movimientos ?? []); setResumen(d.resumen ?? null); setTipos(d.tipos ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function accion(id: string, cuerpo: Record<string, unknown>, exito: string) {
    setOcupado(id); setError(''); setAviso('');
    const r = await fetch(`/api/admin/finanzas/custodia/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setError(j.error ?? 'No se pudo completar.');
    else setAviso(exito + (j.ingreso_id ? ` Ingreso ${String(j.ingreso_id).slice(0, 8)} creado${j.faltan?.length ? `, falta completar: ${j.faltan.join(' · ')}.` : '.'}` : ''));
    setOcupado('');
    cargar();
  }

  async function causar(m: Movimiento) {
    if (tipos.length === 0) { setError('No hay tipos de servicio configurados.'); return; }
    const lista = tipos.map((t, i) => `${i + 1}. ${t.nombre}`).join('\n');
    const elegido = window.prompt(
      `Causar ${dinero(m.valor)} como ingreso.\n\nCon qué tipo de servicio:\n${lista}\n\nEscribe el número:`,
    );
    const i = Number(elegido) - 1;
    if (!tipos[i]) return;
    await accion(m.id, { accion: 'causar', tipo_servicio_id: tipos[i].id }, 'Anticipo causado: salió de custodia.');
  }

  if (cargando) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <Loader2 size={24} style={{ color: C.navy, animation: 'girar 1s linear infinite' }} />
      <style>{'@keyframes girar{to{transform:rotate(360deg)}}'}</style>
    </div>;
  }

  const abiertos = movimientos.filter(m => m.estado === 'RECIBIDO');
  const cerrados = movimientos.filter(m => m.estado !== 'RECIBIDO');

  return (
    <div style={{ maxWidth: 900, paddingBottom: '5rem' }}>
      {error && <div role="alert" style={{ background: C.badBg, border: '1.5px solid #FECACA', color: C.bad, borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
      {aviso && <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: C.ok, borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{aviso}</div>}

      {/* DESGLOSADO, nunca un total único: las arras se entregan y el anticipo
          se causa. Un solo «saldo en custodia» podría esconder ingreso nuestro
          sin declarar detrás de plata ajena. */}
      {resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {[
            { k: 'ajeno' as const, titulo: 'Arras del vendedor', pie: 'no son nuestras: se entregan o se devuelven' },
            { k: 'propio' as const, titulo: 'Anticipos sin causar', pie: 'serán ingreso cuando se causen' },
          ].map(({ k, titulo, pie }) => {
            const d = resumen[k]; const t = tono(d.color);
            return (
              <div key={k} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: '1rem 1.25rem' }}>
                <div style={{ color: C.muted, fontSize: '0.8rem' }}>{titulo}</div>
                <div style={{ color: C.navy, fontWeight: 800, fontSize: '1.6rem' }}>{dinero(d.total)}</div>
                <div style={{ color: C.muted, fontSize: '0.78rem' }}>
                  {d.cantidad === 1 ? '1 movimiento' : `${d.cantidad} movimientos`} · {pie}
                </div>
                {d.cantidad > 0 && d.color !== 'gris' && (
                  <div style={{ marginTop: 6, background: t.bg, color: t.fg, fontWeight: 700, fontSize: '0.74rem', padding: '3px 9px', borderRadius: 999, display: 'inline-block' }}>
                    el más viejo hace {d.masViejoDias} días
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ background: '#F8FAFC', border: `1px dashed ${C.line}`, borderRadius: 14, padding: '1rem 1.25rem' }}>
            <div style={{ color: C.muted, fontSize: '0.8rem' }}>En la cuenta, sin ser utilidad</div>
            <div style={{ color: C.muted, fontWeight: 800, fontSize: '1.4rem' }}>{dinero(resumen.enLaCuenta)}</div>
            <div style={{ color: C.muted, fontSize: '0.78rem' }}>no suma al estado de resultados</div>
          </div>
        </div>
      )}

      {registrando ? (
        <Registrar onListo={() => { setRegistrando(false); setAviso('Dinero registrado en custodia.'); cargar(); }} onCancelar={() => setRegistrando(false)} />
      ) : (
        <button onClick={() => setRegistrando(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px dashed ${C.blue}`, background: '#fff', color: C.blue, fontWeight: 800, borderRadius: 12, padding: '12px 16px', cursor: 'pointer', marginBottom: '1.25rem' }}>
          <Plus size={18} /> Recibí dinero que no es ingreso
        </button>
      )}

      <h3 style={{ color: C.navy, fontSize: '0.95rem', margin: '0 0 0.6rem' }}>
        En custodia ahora {abiertos.length > 0 && `(${abiertos.length})`}
      </h3>
      {abiertos.length === 0 ? (
        <p style={{ color: C.muted, fontSize: '0.88rem' }}>No hay dinero de terceros en custodia.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {abiertos.map(m => {
            const t = tono(m.color);
            const esAnticipo = m.naturaleza === 'ANTICIPO_PROPIO';
            return (
              <div key={m.id} style={{ background: '#fff', border: `1px solid ${m.color === 'rojo' ? '#FCA5A5' : C.line}`, borderRadius: 12, padding: '0.9rem 1rem' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ color: C.navy, fontWeight: 700 }}>{m.concepto}</div>
                    <div style={{ color: C.muted, fontSize: '0.8rem' }}>
                      {[`de ${m.de}`, m.propiedad, `recibido el ${dia(m.fecha)}`].filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
                      <span style={{ background: esAnticipo ? '#EFF6FF' : '#F1F5F9', color: esAnticipo ? '#1D4ED8' : '#334155', fontWeight: 800, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999 }}>
                        {esAnticipo ? 'Anticipo nuestro' : 'Dinero del vendedor'}
                      </span>
                      <span style={{ background: t.bg, color: t.fg, fontWeight: 700, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999 }}>
                        {m.dias} días en custodia
                      </span>
                    </div>
                    {m.motivo && (
                      <div style={{ marginTop: 6, color: t.fg, fontSize: '0.78rem', fontWeight: 600 }}>{m.motivo}</div>
                    )}
                  </div>
                  <div style={{ color: C.navy, fontWeight: 800, whiteSpace: 'nowrap' }}>{dinero(m.valor)}</div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                  {esAnticipo ? (
                    <button onClick={() => causar(m)} disabled={ocupado === m.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${C.ok}`, color: C.ok, background: '#fff', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                      <Check size={15} /> Causar como ingreso
                    </button>
                  ) : (
                    <EntregarA m={m} ocupado={ocupado === m.id} onEntregar={(terceroId) => accion(m.id, { accion: 'entregado', entregado_a: terceroId }, 'Entregado: salió de custodia sin ser ingreso.')} />
                  )}
                  <button onClick={() => { if (confirm('¿Devolver este dinero a quien lo entregó? Sale de custodia y no es ingreso.')) accion(m.id, { accion: 'devuelto' }, 'Devuelto: salió de custodia.'); }}
                    disabled={ocupado === m.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${C.line}`, color: C.navy, background: '#fff', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                    <Undo2 size={15} /> Devolver
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cerrados.length > 0 && (
        <>
          <h3 style={{ color: C.navy, fontSize: '0.95rem', margin: '1.5rem 0 0.6rem' }}>Cerrados</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cerrados.map(m => (
              <div key={m.id} style={{ background: '#F8FAFC', border: `1px solid ${C.line}`, borderRadius: 10, padding: '0.7rem 0.9rem', display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.84rem' }}>
                <span style={{ color: C.muted, minWidth: 74 }}>{dia(m.fecha_cierre ?? m.fecha)}</span>
                <span style={{ flex: 1, color: C.navy }}>
                  {m.concepto} · de {m.de}
                  {m.entregado_a && ` · entregado a ${m.entregado_a}`}
                  {m.ingreso_id && ' · causado como ingreso'}
                </span>
                <span style={{ color: C.muted, fontWeight: 700 }}>{m.estado.toLowerCase()}</span>
                <span style={{ color: C.navy, fontWeight: 700 }}>{dinero(m.valor)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Registro: pocos toques. Valor, qué clase de dinero es, de quién, concepto. */
function Registrar({ onListo, onCancelar }: { onListo: () => void; onCancelar: () => void }) {
  const [valor, setValor] = useState('');
  const [naturaleza, setNaturaleza] = useState<NaturalezaCustodia | null>(null);
  const [concepto, setConcepto] = useState('');
  const [de, setDe] = useState<Destino | null>(null);
  const [propiedad, setPropiedad] = useState<Destino | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const inputS: React.CSSProperties = { padding: '10px 12px', border: `1.5px solid ${C.line}`, borderRadius: 10, fontSize: '0.95rem', color: C.navy, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };

  const cuerpo = (): CustodiaCapturada => ({
    valor: valor.replace(/\./g, ''),
    naturaleza: naturaleza ?? 'DINERO_DE_TERCEROS',
    concepto,
    tercero_id: de?.id ?? null,
    property_id: propiedad?.id ?? null,
  });

  async function guardar() {
    const errores = erroresDeCustodia(cuerpo());
    if (errores.length) { setError(errores.join(' ')); return; }
    setGuardando(true); setError('');
    const r = await fetch('/api/admin/finanzas/custodia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo()),
    });
    const j = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) { setError(j.error ?? 'No se pudo guardar.'); return; }
    onListo();
  }

  return (
    <div style={{ background: '#fff', border: `1.5px solid ${C.navy}`, borderRadius: 14, padding: '1.1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Landmark size={18} style={{ color: C.navy }} />
        <strong style={{ color: C.navy }}>Dinero recibido que NO es ingreso</strong>
        <button onClick={onCancelar} aria-label="Cancelar" style={{ marginLeft: 'auto', border: 'none', background: 'none', color: C.muted, cursor: 'pointer' }}><X size={18} /></button>
      </div>

      {error && <div style={{ background: C.badBg, border: '1.5px solid #FECACA', color: C.bad, borderRadius: 10, padding: '0.7rem 0.9rem', fontSize: '0.84rem' }}>{error}</div>}

      <input value={valor ? `$ ${valor}` : ''} onChange={e => setValor(pesos(e.target.value))} inputMode="numeric" placeholder="$ 0"
        aria-label="Valor recibido"
        style={{ ...inputS, fontSize: '1.8rem', fontWeight: 800, textAlign: 'center', border: 'none', borderBottom: `2px solid ${C.line}`, borderRadius: 0 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {NATURALEZAS_CUSTODIA.map(n => (
          <button key={n.valor} type="button" onClick={() => setNaturaleza(n.valor)}
            style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${naturaleza === n.valor ? C.navy : C.line}`, background: naturaleza === n.valor ? '#F8FAFC' : '#fff', cursor: 'pointer' }}>
            <div style={{ color: C.navy, fontWeight: 700, fontSize: '0.92rem' }}>{n.titulo}</div>
            <div style={{ color: C.muted, fontSize: '0.8rem' }}>{n.ayuda}</div>
            <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: 2 }}>Al final: {n.salida}.</div>
          </button>
        ))}
      </div>

      <input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Concepto: arras, depósito de seriedad, anticipo…" style={inputS} aria-label="Concepto" />

      <div>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>¿De quién se recibió?</label>
        <SelectorTercero elegido={de} onElegir={setDe} />
      </div>
      <div>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Propiedad de la operación (opcional)</label>
        <SelectorTercero elegido={propiedad} onElegir={setPropiedad} propiedades />
      </div>

      <button onClick={guardar} disabled={guardando}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.navy, color: '#fff', border: 'none', borderRadius: 12, padding: '13px 16px', fontWeight: 800, cursor: 'pointer' }}>
        {guardando ? <Loader2 size={17} className="girar" /> : <ArrowDownToLine size={17} />} Registrar en custodia
      </button>
      <style>{'.girar{animation:girar 1s linear infinite}@keyframes girar{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

/** Entregar al vendedor exige decir a quién: queda el rastro de dónde fue. */
function EntregarA({ m, ocupado, onEntregar }: { m: Movimiento; ocupado: boolean; onEntregar: (terceroId: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} disabled={ocupado}
        style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${C.navy}`, color: C.navy, background: '#fff', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
        <ArrowUpFromLine size={15} /> Entregar al vendedor
      </button>
    );
  }
  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: 6 }}>¿A quién se le entregó {dinero(m.valor)}?</div>
      <SelectorTercero elegido={null} onElegir={d => { if (d) onEntregar(d.id); setAbierto(false); }} />
    </div>
  );
}

function SelectorTercero({ elegido, onElegir, propiedades = false }: { elegido: Destino | null; onElegir: (d: Destino | null) => void; propiedades?: boolean }) {
  const [q, setQ] = useState('');
  const [lista, setLista] = useState<Destino[]>([]);
  const [creando, setCreando] = useState(false);

  const buscar = useCallback(async (texto: string) => {
    try {
      const r = await fetch(`/api/admin/finanzas/destinos?q=${encodeURIComponent(texto)}`);
      const d = await r.json();
      setLista(propiedades ? d.propiedades ?? [] : d.terceros ?? []);
    } catch { /* la lista queda como esté */ }
  }, [propiedades]);

  useEffect(() => { buscar(''); }, [buscar]);
  useEffect(() => { const t = setTimeout(() => buscar(q), 250); return () => clearTimeout(t); }, [q, buscar]);

  if (elegido) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${C.navy}`, borderRadius: 10, padding: '9px 11px' }}>
        <span style={{ flex: 1, color: C.navy, fontWeight: 700, fontSize: '0.88rem' }}>{elegido.etiqueta}</span>
        <button type="button" onClick={() => onElegir(null)} aria-label="Cambiar" style={{ border: 'none', background: 'none', color: C.muted, cursor: 'pointer' }}><X size={15} /></button>
      </div>
    );
  }

  async function crear() {
    setCreando(true);
    try {
      const r = await fetch('/api/admin/finanzas/destinos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: q, rol: 'CLIENTE' }),
      });
      if (r.ok) onElegir(await r.json());
    } finally { setCreando(false); }
  }

  return (
    <div style={{ border: `1.5px solid ${C.line}`, borderRadius: 10, padding: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Search size={15} style={{ color: C.muted }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={propiedades ? 'Buscar propiedad…' : 'Buscar persona o empresa…'}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem', color: C.navy, fontFamily: 'inherit' }} />
      </div>
      <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {lista.map(d => (
          <button key={d.id} type="button" onClick={() => onElegir(d)}
            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', cursor: 'pointer', color: C.navy, fontSize: '0.86rem' }}>
            {d.etiqueta}
            {d.detalle && <span style={{ display: 'block', fontSize: '0.74rem', color: C.muted }}>{d.detalle}</span>}
          </button>
        ))}
        {lista.length === 0 && <span style={{ color: C.muted, fontSize: '0.82rem', padding: 4 }}>Sin resultados.</span>}
      </div>
      {!propiedades && q.trim().length >= 3 && (
        <button type="button" onClick={crear} disabled={creando}
          style={{ marginTop: 6, width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px dashed ${C.blue}`, background: '#fff', color: C.blue, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
          {creando ? 'Creando…' : `Crear «${q.trim()}»`}
        </button>
      )}
    </div>
  );
}
